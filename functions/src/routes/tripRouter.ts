import express from "express";
import { ObjectId } from "mongodb";
import { getClient } from "../db";
import Trip, { Comment, Message, Participant } from "../models/Trip";

const tripRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

tripRouter.get("/:id/full-trip", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string = req.params.id;
    const results = await client
      .db()
      .collection<Trip>("trips")
      .aggregate([
        { $match: { _id: new ObjectId(tripId) } },

        { $unwind: "$participants" },
        {
          $lookup: {
            from: "users",
            localField: "participants.uid",
            foreignField: "uid",
            as: "participants.user",
          },
        },
        { $unwind: "$participants.user" },
        {
          $lookup: {
            from: "cities",
            let: { cityId: { $toObjectId: "$cityId" } },
            pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$cityId"] } } }],
            as: "city",
          },
        },
        { $unwind: { path: "$city" } },
        {
          $lookup: {
            from: "users",
            let: { uid: "$creatorUid" },
            pipeline: [
              { $match: { $expr: { $eq: ["$uid", "$$uid"] } } },
              {
                $project: {
                  username: 1,
                  displayName: 1,
                  photoURL: 1,
                  uid: 1,
                },
              },
            ],
            as: "creator",
          },
        },
        { $unwind: { path: "$creator" } },
        {
          $group: {
            _id: "$_id",
            creator: { $first: "$creator" },
            city: { $first: "$city" },
            nickname: { $first: "$nickname" },
            startDate: { $first: "$startDate" },
            endDate: { $first: "$endDate" },
            hotel: { $first: "$hotel" },
            schedule: { $first: "$schedule" },
            photos: { $first: "$photos" },
            participants: { $push: "$participants" },
            messages: { $first: "$messages" },
            completed: { $first: "$completed" },
            likesUids: { $first: "$likesUids" },
            comments: { $first: "$comments" },
          },
        },
      ])
      .toArray();
    res.status(200).json(results[0]);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.get("/followings-trips/:includedUids", async (req, res) => {
  try {
    const client = await getClient();
    const includedUids: string[] = req.params.includedUids.split(",");
    const results = await client
      .db()
      .collection<Trip>("trips")
      .aggregate([
        {
          $match: {
            participants: {
              $elemMatch: { uid: { $in: includedUids } },
            },
            completed: true,
          },
        },
        { $unwind: "$participants" },
        {
          $lookup: {
            from: "users",
            localField: "participants.uid",
            foreignField: "uid",
            as: "participants.user",
          },
        },
        { $unwind: "$participants.user" },
        {
          $lookup: {
            from: "cities",
            let: { cityId: { $toObjectId: "$cityId" } },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$cityId"] } } },
              { $project: { cityName: 1, photoURL: 1 } },
            ],
            as: "city",
          },
        },
        { $unwind: { path: "$city" } },
        {
          $lookup: {
            from: "users",
            localField: "comments.uid",
            foreignField: "uid",
            as: "user",
          },
        },
        {
          $set: {
            comments: {
              $map: {
                input: "$comments",
                in: {
                  $mergeObjects: [
                    "$$this",
                    {
                      user: {
                        $arrayElemAt: [
                          "$user",
                          { $indexOfArray: ["$user.uid", "$$this.uid"] },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            let: { uid: "$creatorUid" },
            pipeline: [
              { $match: { $expr: { $eq: ["$uid", "$$uid"] } } },
              {
                $project: {
                  username: 1,
                  displayName: 1,
                  photoURL: 1,
                  uid: 1,
                },
              },
            ],
            as: "creator",
          },
        },
        { $unwind: { path: "$creator" } },
        {
          $group: {
            _id: "$_id",
            creator: { $first: "$creator" },
            city: { $first: "$city" },
            nickname: { $first: "$nickname" },
            startDate: { $first: "$startDate" },
            endDate: { $first: "$endDate" },
            hotel: { $first: "$hotel" },
            schedule: { $first: "$schedule" },
            photos: { $first: "$photos" },
            participants: { $push: "$participants" },
            messages: { $first: "$messages" },
            completed: { $first: "$completed" },
            likesUids: { $first: "$likesUids" },
            comments: { $first: "$comments" },
          },
        },
        {
          $lookup: {
            from: "users",
            let: { likesUids: "$likesUids" },
            pipeline: [
              { $match: { $expr: { $in: ["$uid", "$$likesUids"] } } },
              {
                $project: { uid: 1, username: 1, displayName: 1, photoURL: 1 },
              },
            ],
            as: "likes",
          },
        },
        { $sort: { endDate: -1 } },
        {
          $project: {
            "participants.user.notifications": 0,
            "participants.user.preferences": 0,
            "participants.user.favoriteCityIds": 0,
            "participants.user.followingUids": 0,
            "participants.user.hiddenCityIds": 0,
            "participants.user.hometownId": 0,
            "participants.user.phoneNumber": 0,
            "participants.user.visitedCityIds": 0,
            "participants.user.email": 0,
            "participants.uid": 0,
            "comments.user.notifications": 0,
            "comments.user.preferences": 0,
            "comments.user.favoriteCityIds": 0,
            "comments.user.followingUids": 0,
            "comments.user.hiddenCityIds": 0,
            "comments.user.hometownId": 0,
            "comments.user.phoneNumber": 0,
            "comments.user.visitedCityIds": 0,
            "comments.user.email": 0,
            "comments.uid": 0,
            likesUids: 0,
          },
        },
      ])
      .toArray();
    res.status(200).json(results);
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

tripRouter.put("/:id/update-nickname/:nickname", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const nickname: string | undefined = req.params.nickname;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne({ _id: new ObjectId(id) }, { $set: { nickname } });
    res.status(200).json(nickname);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:tripId/update-creator/:newUid", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const newUid: string | undefined = req.params.newUid;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $set: { creatorUid: newUid } }
      );
    res.status(200).json(newUid);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:id/new-participant", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const newParticipant: Participant = req.body;
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

tripRouter.put("/:tripId/:uid/accept-trip", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string = req.params.tripId;
    const uid: string = req.params.uid;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $set: { [`participants.$[participant].accepted`]: true } },
        { arrayFilters: [{ "participant.uid": uid }] }
      );
    res.status(200).json("Success");
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

tripRouter.put("/new-message/:tripId", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const newMessage: Message = req.body;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $push: { messages: newMessage } }
      );
    res.status(200).json(newMessage);
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
    res.status(200).json(photo);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:id/like-trip/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const like: string = req.params.uid;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne({ _id: new ObjectId(id) }, { $push: { likesUids: like } });
    res.status(200).json(like);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:tripId/unlike-trip/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const uid: string | undefined = req.params.uid;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne({ _id: new ObjectId(tripId) }, { $pull: { likesUids: uid } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/remove-all-user-likes/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string = req.params.uid;
    await client
      .db()
      .collection<Trip>("trips")
      .updateMany({ likesUids: uid }, { $pull: { likesUids: uid } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:tripId/comment-trip", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const comment: Comment = req.body;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $push: { comments: comment } }
      );
    res.status(200).json(comment);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/:tripId/remove-comment-trip", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const commentObject: Comment = req.body;
    const { uid, comment, date } = commentObject;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $pull: { comments: { uid, comment, date } } }
      );
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/remove-all-user-comments/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string = req.params.uid;
    await client
      .db()
      .collection<Trip>("trips")
      .updateMany(
        { comments: { $elemMatch: { uid } } },
        { $pull: { comments: { uid } } }
      );
  } catch (err) {
    errorResponse(err, res);
  }
});

export default tripRouter;
