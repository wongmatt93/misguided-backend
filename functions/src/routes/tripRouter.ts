import express from "express";
import { ObjectId } from "mongodb";
import { getClient } from "../db";
import NewTrip, {
  NewParticipant,
  Comment,
  Message,
  Trip,
} from "../models/Trip";

const tripRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

tripRouter.get("/full-trip/:tripId", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string = req.params.tripId;
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
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$cityId"] } } },
              {
                $lookup: {
                  from: "users",
                  let: { visitorsUids: "$visitorsUids" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $in: ["$uid", "$$visitorsUids"] },
                      },
                    },
                    {
                      $project: {
                        uid: 1,
                        username: 1,
                        displayName: 1,
                        photoURL: 1,
                      },
                    },
                  ],
                  as: "visitors",
                },
              },
              { $project: { cityName: 1, photoURL: 1, visitors: 1 } },
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
              {
                $lookup: {
                  from: "users",
                  let: { visitorsUids: "$visitorsUids" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $in: ["$uid", "$$visitorsUids"] },
                      },
                    },
                    {
                      $project: {
                        uid: 1,
                        username: 1,
                        displayName: 1,
                        photoURL: 1,
                      },
                    },
                  ],
                  as: "visitors",
                },
              },
              { $project: { cityName: 1, photoURL: 1, visitors: 1 } },
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

tripRouter.delete("/:tripId", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string = req.params.tripId;
    await client
      .db()
      .collection<NewTrip>("trips")
      .deleteOne({ _id: new ObjectId(tripId) });
    res.sendStatus(204);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/update-nickname/:tripId/:nickname", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const nickname: string | undefined = req.params.nickname;
    await client
      .db()
      .collection<NewTrip>("trips")
      .updateOne({ _id: new ObjectId(tripId) }, { $set: { nickname } });
    res.status(200).json(nickname);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/new-participant/:tripId", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const newParticipant: NewParticipant = req.body;
    await client
      .db()
      .collection<NewTrip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $push: { participants: newParticipant } }
      );
    res.status(200);
    res.json(newParticipant);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/accept-trip/:tripId/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string = req.params.tripId;
    const uid: string = req.params.uid;
    await client
      .db()
      .collection<NewTrip>("trips")
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

tripRouter.put("/remove-participant/:tripId/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const uid: string | undefined = req.params.uid;
    await client
      .db()
      .collection<NewTrip>("trips")
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
      .collection<NewTrip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $push: { messages: newMessage } }
      );
    res.status(200).json(newMessage);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/complete-trip/:tripId", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    await client
      .db()
      .collection<NewTrip>("trips")
      .updateOne({ _id: new ObjectId(tripId) }, { $set: { completed: true } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/photos/:tripId", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const photo: string = req.body.photo;
    await client
      .db()
      .collection<NewTrip>("trips")
      .updateOne({ _id: new ObjectId(tripId) }, { $push: { photos: photo } });
    res.status(200).json(photo);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/like-trip/:tripId/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const like: string = req.params.uid;
    await client
      .db()
      .collection<NewTrip>("trips")
      .updateOne({ _id: new ObjectId(tripId) }, { $push: { likesUids: like } });
    res.status(200).json(like);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/unlike-trip/:tripId/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const uid: string | undefined = req.params.uid;
    await client
      .db()
      .collection<NewTrip>("trips")
      .updateOne({ _id: new ObjectId(tripId) }, { $pull: { likesUids: uid } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/comment-trip/:tripId", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const comment: Comment = req.body;
    await client
      .db()
      .collection<NewTrip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $push: { comments: comment } }
      );
    res.status(200).json(comment);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/remove-comment-trip/:tripId", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const commentObject: Comment = req.body;
    const { uid, comment, date } = commentObject;
    await client
      .db()
      .collection<NewTrip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $pull: { comments: { uid, comment, date } } }
      );
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

export default tripRouter;
