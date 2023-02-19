import express from "express";
import { ObjectId } from "mongodb";
import { getClient } from "../db";
import Trip, { Like, Participant, Comment } from "../models/Trip";

const tripRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

tripRouter.get("/:id", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string = req.params.id;
    const results = await client
      .db()
      .collection<Trip>("trips")
      .findOne({ _id: new ObjectId(tripId) });
    res.json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.get("/trips-by-tripIds/:tripIds", async (req, res) => {
  try {
    const newArray: string[] = req.params.tripIds.split(",");
    const tripIds: ObjectId[] = [];
    newArray.forEach((item) => tripIds.push(new ObjectId(item)));
    const client = await getClient();
    const cursor = client
      .db()
      .collection<Trip>("trips")
      .find({ _id: { $in: tripIds } });
    const results = await cursor.toArray();
    res.json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.get("/:uid/latest", async (req, res) => {
  try {
    const client = await getClient();
    const creatorUid: string = req.params.uid;
    const results = await client
      .db()
      .collection<Trip>("trips")
      .find({ creatorUid })
      .limit(1)
      .sort({ $natural: -1 })
      .toArray();
    res.json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.post("/", async (req, res) => {
  try {
    const client = await getClient();
    const newTrip: Trip = req.body;
    await client.db().collection<Trip>("trips").insertOne(newTrip);
    res.status(200).json(newTrip);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.delete("/:id", async (req, res) => {
  try {
    const client = await getClient();
    const id: string = req.params.id;
    await client
      .db()
      .collection<Trip>("trips")
      .deleteOne({ _id: new ObjectId(id) });
    res.sendStatus(204);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:id/new-participant", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const newParticipant: Participant = req.body.newParticipant;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(id) },
        { $push: { participants: newParticipant } }
      );
    res.status(200);
    res.json(newParticipant);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:tripId/:uid/remove-participant", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const uid: string | undefined = req.params.uid;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $pull: { participants: { uid } } }
      );
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:id/complete-trip", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne({ _id: new ObjectId(id) }, { $set: { completed: true } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:id/photos", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const photo: string = req.body.photo;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne({ _id: new ObjectId(id) }, { $push: { photos: photo } });
    res.status(200);
    res.json(photo);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:id/like-trip", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const like: Like = req.body.like;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne({ _id: new ObjectId(id) }, { $push: { likes: like } });
    res.status(200).json(like);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:tripId/:uid/unlike-trip", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const uid: string | undefined = req.params.uid;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne({ _id: new ObjectId(tripId) }, { $pull: { likes: { uid } } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:id/comment-trip", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const comment: Comment = req.body.comment;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne({ _id: new ObjectId(id) }, { $push: { comments: comment } });
    res.status(200).json(comment);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:id/:uid/:date/delete-comment-trip", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const uid: string | undefined = req.params.uid;
    const date: string | undefined = req.params.date;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(id) },
        { $pull: { comments: { uid, date } } }
      );
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

export default tripRouter;
