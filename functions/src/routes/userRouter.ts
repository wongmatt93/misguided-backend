import express from "express";
import { FindOptions, ObjectId } from "mongodb";
import { getClient } from "../db";
import { Notification, Preferences, UserTemplate } from "../models/UserProfile";

const userRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

// userRouter.get("/", async (req, res) => {
//   try {
//     const client = await getClient();
//     const cursor = client.db().collection<UserTemplate>("users").find();
//     const results = await cursor.toArray();
//     res.status(200).json(results);
//   } catch (err) {
//     errorResponse(err, res);
//   }
// });

// userRouter.get("/users-by-uid/:uids", async (req, res) => {
//   try {
//     const uids: string[] = req.params.uids.split(",");
//     const client = await getClient();
//     const cursor = client
//       .db()
//       .collection<UserTemplate>("users")
//       .find({ uid: { $in: uids } });
//     const results = await cursor.toArray();
//     res.status(200).json(results);
//   } catch (err) {
//     errorResponse(err, res);
//   }
// });

// userRouter.get("/:uid/uid", async (req, res) => {
//   try {
//     const uid: string = req.params.uid;
//     const client = await getClient();
//     const result = await client
//       .db()
//       .collection<UserTemplate>("users")
//       .findOne({ uid });
//     res.status(200).json(result);
//   } catch (err) {
//     errorResponse(err, res);
//   }
// });

// This endpoint takes in a uid and date, and returns a UserProfile
userRouter.get("/user-by-uid/:uid/:date", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string = req.params.uid;
    const date: string = req.params.date;
    const result = await client
      .db()
      .collection<UserTemplate>("users")
      .aggregate([
        { $match: { uid } },
        {
          $lookup: {
            from: "users",
            let: { uid: "$uid" },
            pipeline: [
              { $match: { $expr: { $in: ["$$uid", "$followingUids"] } } },
              {
                $project: { uid: 1, username: 1, displayName: 1, photoURL: 1 },
              },
            ],
            as: "followers",
          },
        },
        {
          $lookup: {
            from: "users",
            let: { followingUids: "$followingUids" },
            pipeline: [
              { $match: { $expr: { $in: ["$uid", "$$followingUids"] } } },
              {
                $project: { uid: 1, username: 1, displayName: 1, photoURL: 1 },
              },
            ],
            as: "followings",
          },
        },
        {
          $lookup: {
            from: "trips",
            let: { uid: "$uid" },
            pipeline: [
              {
                $match: {
                  endDate: { $gt: date },
                  $expr: { $in: ["$$uid", "$participants.uid"] },
                },
              },
              {
                $lookup: {
                  from: "cities",
                  let: { cityId: "$cityId" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$_id", { $toObjectId: "$$cityId" }] },
                      },
                    },
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
              { $unwind: "$city" },
              { $unwind: "$creator" },
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
                $project: {
                  cityId: 0,
                  creatorUid: 0,
                  "participants.user.notifications": 0,
                  "participants.user.preferences": 0,
                  "participants.user.favoriteCityIds": 0,
                  "participants.user.followingUids": 0,
                  "participants.user.hiddenCityIds": 0,
                  "participants.user.hometownId": 0,
                  "participants.user.phoneNumber": 0,
                  "participants.user.email": 0,
                  "participants.uid": 0,
                },
              },
            ],
            as: "upcomingTrips",
          },
        },
        {
          $lookup: {
            from: "trips",
            let: { uid: "$uid" },
            pipeline: [
              {
                $match: {
                  endDate: { $lt: date },
                  $expr: { $in: ["$$uid", "$participants.uid"] },
                },
              },
              {
                $lookup: {
                  from: "cities",
                  let: { cityId: "$cityId" },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ["$_id", { $toObjectId: "$$cityId" }] },
                      },
                    },
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
              { $unwind: "$city" },
              { $unwind: "$creator" },
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
                $project: {
                  cityId: 0,
                  creatorUid: 0,
                  "participants.user.notifications": 0,
                  "participants.user.preferences": 0,
                  "participants.user.favoriteCityIds": 0,
                  "participants.user.followingUids": 0,
                  "participants.user.hiddenCityIds": 0,
                  "participants.user.hometownId": 0,
                  "participants.user.phoneNumber": 0,
                  "participants.user.email": 0,
                  "participants.uid": 0,
                },
              },
            ],
            as: "pastTrips",
          },
        },
        {
          $lookup: {
            from: "cities",
            let: { uid: "$uid" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$$uid", "$visitorsUids"] },
                },
              },
              {
                $lookup: {
                  from: "users",
                  let: { visitorsUids: "$visitorsUids" },
                  pipeline: [
                    { $match: { $expr: { $in: ["$uid", "$$visitorsUids"] } } },
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
              {
                $project: {
                  cityDescription: 0,
                  cityCode: 0,
                  country: 0,
                  knownFor: 0,
                  latitude: 0,
                  longitude: 0,
                  ratings: 0,
                  visitorsUids: 0,
                },
              },
            ],
            as: "visitedCities",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "notifications.uid",
            foreignField: "uid",
            as: "user",
          },
        },
        {
          $set: {
            notifications: {
              $map: {
                input: "$notifications",
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
          $project: {
            followingUids: 0,
            "notifications.user.notifications": 0,
            "notifications.user.preferences": 0,
            "notifications.user.favoriteCityIds": 0,
            "notifications.user.followingUids": 0,
            "notifications.user.hiddenCityIds": 0,
            "notifications.user.hometownId": 0,
            "notifications.user.phoneNumber": 0,
            "notifications.user.email": 0,
            "notifications.uid": 0,
            user: 0,
          },
        },
      ])
      .toArray();
    res.status(200).json(result[0]);
  } catch (err) {
    errorResponse(err, res);
  }
});

// This endpoint takes in an array of uids, and returns an array of UserTemplates that exclude the original array
userRouter.get("/suggestions/:excludedUids", async (req, res) => {
  try {
    const client = await getClient();
    const excludedUids: string[] = req.params.excludedUids.split(",");
    const results = await client
      .db()
      .collection<UserTemplate>("users")
      .find({
        uid: { $nin: excludedUids },
      })
      .project({ uid: 1, username: 1, displayName: 1, photoURL: 1 })
      .limit(3)
      .toArray();
    res.status(200).json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

// This endpoint takes in a username string and returns a UserSummary if it exists, or undefined otherwise
userRouter.get("/user-by-username/:username", async (req, res) => {
  try {
    const username: string = req.params.username;
    const client = await getClient();
    const result = await client
      .db()
      .collection<UserTemplate>("users")
      .findOne(
        {
          username: {
            $regex: username,
            $options: "i",
          },
        },
        {
          uid: 1,
          username: 1,
          displayName: 1,
          photoURL: 1,
        } as FindOptions<Document>
      );
    res.status(200).json(result);
  } catch (err) {
    errorResponse(err, res);
  }
});

// This endpoint takes in a search string and returns an array of UserSummary
userRouter.get("/:username/:search/search", async (req, res) => {
  try {
    const username: string = req.params.username;
    const search: string = req.params.search;
    const client = await getClient();
    const cursor = client
      .db()
      .collection<UserTemplate>("users")
      .find({
        username: {
          $regex: search,
          $options: "i",
          $not: { $regex: username },
        },
      })
      .project({ uid: 1, username: 1, displayName: 1, photoURL: 1 });
    const result = await cursor.toArray();
    res.status(200).json(result);
  } catch (err) {
    errorResponse(err, res);
  }
});

// This endpoint takes in a UID and deletes notifications that contain this uid
userRouter.put("/remove-all-user-notifications/:uid", async (req, res) => {
  try {
    const uid: string = req.params.uid;
    const client = await getClient();
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateMany(
        { notifications: { $elemMatch: { uid } } },
        { $pull: { notifications: { uid } } }
      );
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

// This endpoint takes in a UserTemplate object and adds it to the database
userRouter.post("/", async (req, res) => {
  try {
    const newProfile: UserTemplate = req.body;
    const client = await getClient();
    await client.db().collection<UserTemplate>("users").insertOne(newProfile);
    res.status(201).json("Profile Successfully Added!");
  } catch (err) {
    errorResponse(err, res);
  }
});

// This endpoint deletes a UserTemplate from the database
userRouter.delete("/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string = req.params.uid;
    await client.db().collection<UserTemplate>("users").deleteOne({ uid });
    res.sendStatus(204);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/update-user-template/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string = req.params.uid;
    const userProfile: UserTemplate = req.body;

    userProfile._id = new ObjectId(userProfile._id);

    await client
      .db()
      .collection<UserTemplate>("users")
      .replaceOne({ uid }, userProfile);
    res.status(200).json(userProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/add-following/:userUid/:otherUid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.userUid;
    const newFollowing: string | undefined = req.params.otherUid;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateOne({ uid }, { $push: { followingUids: newFollowing } });
    res.status(200).json(newFollowing);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/remove-following/:userUid/:otherUid", async (req, res) => {
  try {
    const client = await getClient();
    const userUid: string | undefined = req.params.userUid;
    const otherUid: string | undefined = req.params.otherUid;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateOne({ uid: userUid }, { $pull: { followingUids: otherUid } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/remove-all-followings/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string = req.params.uid;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateMany({ followingUids: uid }, { $pull: { followingUids: uid } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/add-notification/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const newNotification: Notification = req.body;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateOne({ uid }, { $push: { notifications: newNotification } });
    res.status(200).json(newNotification);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/read-notification/:uid/:notifUid/:date", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const notifUid: string | undefined = req.params.notifUid;
    const date: string | undefined = req.params.date;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateOne(
        { uid },
        { $set: { [`notifications.$[notification].read`]: true } },
        {
          arrayFilters: [
            { "notification.uid": notifUid, "notification.date": date },
          ],
        }
      );
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put(
  "/unread-notification/:uid/:notifUid/:date",
  async (req, res) => {
    try {
      const client = await getClient();
      const uid: string | undefined = req.params.uid;
      const notifUid: string | undefined = req.params.notifUid;
      const date: string | undefined = req.params.date;
      await client
        .db()
        .collection<UserTemplate>("users")
        .updateOne(
          { uid },
          { $set: { [`notifications.$[notification].read`]: false } },
          {
            arrayFilters: [
              { "notification.uid": notifUid, "notification.date": date },
            ],
          }
        );
      res.status(200).json("Success");
    } catch (err) {
      errorResponse(err, res);
    }
  }
);

userRouter.put(
  "/delete-notification/:uid/:notifUid/:date",
  async (req, res) => {
    try {
      const client = await getClient();
      const uid: string | undefined = req.params.uid;
      const notifUid: string | undefined = req.params.notifUid;
      const date: string | undefined = req.params.date;
      await client
        .db()
        .collection<UserTemplate>("users")
        .updateOne(
          { uid },
          { $pull: { notifications: { uid: notifUid, date } } }
        );
      res.status(200).json("Success");
    } catch (err) {
      errorResponse(err, res);
    }
  }
);

userRouter.put("/update-photo/:uid/", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const newPhoto: string = req.body.photoURL;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateOne({ uid }, { $set: { photoURL: newPhoto } });
    res.status(200).json(newPhoto);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/update-hometown/:uid/:cityId", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const cityId: string = req.params.cityId;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateOne({ uid }, { $set: { hometownId: cityId } });
    res.status(200).json(cityId);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/update-phone/:uid/:phone", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const phone: string = req.params.phone;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateOne({ uid }, { $set: { phoneNumber: phone } });
    res.status(200).json(phone);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/update-preferences/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const preferences: Preferences = req.body.preferences;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateOne({ uid }, { $set: { preferences } });
    res.status(200).json(preferences);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/add-favorite-city/:uid/:cityId", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const cityId: string | undefined = req.params.cityId;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateOne({ uid }, { $push: { favoriteCityIds: cityId } });
    res.status(200).json(cityId);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/remove-favorite-city/:uid/:cityId", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const cityId: string | undefined = req.params.cityId;
    await client
      .db()
      .collection<UserTemplate>("users")
      .updateOne({ uid }, { $pull: { favoriteCityIds: cityId } });
    res.status(200).json(cityId);
  } catch (err) {
    errorResponse(err, res);
  }
});

export default userRouter;
