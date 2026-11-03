 
import { Router } from "express";
import { ObjectId } from "mongodb";
import verifyToken from "../../middleware/verifyToken.js";

const router = Router();

// Get all events - Public
router.get("/", async (req, res) => {
  try {
    const events = req.app.locals.db.collection("events");

    const result = await events
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching events:", error);

    res.status(500).json({
      message: "Failed to fetch events",
    });
  }
});

// Get my events - Protected
router.get("/my-events", verifyToken, async (req, res) => {
  try {
    const events = req.app.locals.db.collection("events");

    const result = await events
      .find({
        organizerId: req.user.id,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching user's events:", error);

    res.status(500).json({
      message: "Failed to fetch your events",
    });
  }
});

// Get joined events - Protected
router.get("/joined", verifyToken, async (req, res) => {
  try {
    const db = req.app.locals.db;

    const result = await db.collection("joinedEvents")
      .aggregate([
        {
          $match: {
            userId: req.user.id,
          },
        },
        {
          $addFields: {
            eventObjectId: {
              $toObjectId: "$eventId",
            },
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "eventObjectId",
            foreignField: "_id",
            as: "event",
          },
        },
        {
          $unwind: "$event",
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$event",
                {
                  joinedAt: "$joinedAt",
                  joinedRecordId: "$_id",
                },
              ],
            },
          },
        },
        {
          $sort: {
            joinedAt: -1,
          },
        },
      ])
      .toArray();

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching joined events:", error);

    res.status(500).json({
      message: "Failed to fetch joined events",
    });
  }
});

// Get a single event with volunteer information - Public
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const db = req.app.locals.db;

    const event = await db.collection("events").findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const joinedRecords = await db.collection("joinedEvents")
      .find({ eventId: id })
      .sort({ joinedAt: -1 })
      .toArray();

    const userIds = joinedRecords
      .map((record) => record.userId)
      .filter((userId) => ObjectId.isValid(userId))
      .map((userId) => new ObjectId(userId));

    const volunteers = userIds.length
      ? await db.collection("user")
          .find(
            {
              _id: { $in: userIds },
            },
            {
              projection: {
                name: 1,
                image: 1,
              },
            }
          )
          .toArray()
      : [];

    const volunteerList = joinedRecords
      .map((record) => {
        const volunteer = volunteers.find(
          (user) => user._id.toString() === record.userId
        );

        if (!volunteer) {
          return null;
        }

        return {
          _id: volunteer._id,
          name: volunteer.name,
          image: volunteer.image || "",
          joinedAt: record.joinedAt,
        };
      })
      .filter(Boolean);

    const joinedCount = joinedRecords.length;

    res.status(200).json({
      ...event,
      joinedCount,
      remainingSpots: Math.max(
        0,
        Number(event.volunteerSpots) - joinedCount
      ),
      volunteers: volunteerList,
    });
  } catch (error) {
    console.error("Error fetching event:", error);

    res.status(500).json({
      message: "Failed to fetch event",
    });
  }
});

// Join an event - Protected
router.post("/:id/join", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const db = req.app.locals.db;
    const events = db.collection("events");
    const joinedEvents = db.collection("joinedEvents");

    const event = await events.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    const existingJoin = await joinedEvents.findOne({
      userId: req.user.id,
      eventId: id,
    });

    if (existingJoin) {
      return res.status(409).json({
        message: "You have already joined this event.",
      });
    }

    const joinedCount = await joinedEvents.countDocuments({
      eventId: id,
    });

    if (joinedCount >= Number(event.volunteerSpots)) {
      return res.status(400).json({
        message: "Sorry, all volunteer spots are filled.",
      });
    }

    await joinedEvents.insertOne({
      userId: req.user.id,
      eventId: id,
      joinedAt: new Date(),
    });

    res.status(201).json({
      message: "You successfully joined this event!",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already joined this event.",
      });
    }

    console.error("Error joining event:", error);

    res.status(500).json({
      message: "Failed to join event",
    });
  }
});

// Cancel participation - Protected
router.delete("/:id/leave", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const joinedEvents = req.app.locals.db.collection("joinedEvents");

    const result = await joinedEvents.deleteOne({
      userId: req.user.id,
      eventId: id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "You have not joined this event.",
      });
    }

    res.status(200).json({
      message: "You successfully cancelled your participation.",
    });
  } catch (error) {
    console.error("Error cancelling participation:", error);

    res.status(500).json({
      message: "Failed to cancel participation",
    });
  }
});

// Create event - Protected
router.post("/", verifyToken, async (req, res) => {
  try {
    const events = req.app.locals.db.collection("events");

    const newEvent = {
      ...req.body,
      organizerId: req.user.id,
      organizerEmail: req.user.email,
      createdAt: new Date(),
    };

    const result = await events.insertOne(newEvent);

    res.status(201).json({
      message: "Event created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating event:", error);

    res.status(500).json({
      message: "Failed to create event",
    });
  }
});

// Update event - Protected, organizer only
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const {
      title,
      category,
      date,
      startTime,
      location,
      volunteerSpots,
      imageUrl,
      description,
    } = req.body;

    const updatedData = {
      title,
      category,
      date,
      startTime,
      location,
      volunteerSpots:
        volunteerSpots === undefined
          ? undefined
          : Number(volunteerSpots),
      imageUrl,
      description,
      updatedAt: new Date(),
    };

    Object.keys(updatedData).forEach((key) => {
      if (updatedData[key] === undefined) {
        delete updatedData[key];
      }
    });

    const events = req.app.locals.db.collection("events");

    const result = await events.updateOne(
      {
        _id: new ObjectId(id),
        organizerId: req.user.id,
      },
      {
        $set: updatedData,
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Event not found or you are not its organizer.",
      });
    }

    res.status(200).json({
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Error updating event:", error);

    res.status(500).json({
      message: "Failed to update event",
    });
  }
});

// Delete event - Protected, organizer only
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const events = req.app.locals.db.collection("events");

    const result = await events.deleteOne({
      _id: new ObjectId(id),
      organizerId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Event not found or you are not its organizer.",
      });
    }

    res.status(200).json({
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);

    res.status(500).json({
      message: "Failed to delete event",
    });
  }
});

export default router;
