 
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

// Get a single event - Public
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid event ID",
      });
    }

    const events = req.app.locals.db.collection("events");

    const event = await events.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error("Error fetching event:", error);

    res.status(500).json({
      message: "Failed to fetch event",
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

    // Remove undefined values
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
