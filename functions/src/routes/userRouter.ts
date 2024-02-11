import express from "express";
import { FindOptions, ObjectId } from "mongodb";
import { getClient } from "../db";
import City from "../models/City";
import Trip, { ParticipantSummary, TripSummary } from "../models/Trip";
import { Preferences, UserProfile } from "../models/UserProfile";
import { addNotificationQuery, tripsQuery } from "../queries/userQueries";
import { currentDateString } from "../utils/dateFunctions";

const userRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

// userRouter.get("/users-by-uid/:uids", async (req, res) => {
//   try {
//     const uids: string[] = req.params.uids.split(",");
//     const client = await getClient();
//     const cursor = client
//       .db()
//       .collection<UserProfile>("users")
//       .find({ uid: { $in: uids } });
//     const results = await cursor.toArray();
//     res.status(200).json(results);
//   } catch (err) {
//     errorResponse(err, res);
//   }
// });

// This endpoint takes in a uid and date, and returns a UserProfile
userRouter.get("/user-by-uid/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string = req.params.uid;
    const result = await client
      .db()
      .collection<UserProfile>("users")
      .aggregate([
        { $match: { uid } },
        {
          $unwind: {
            path: "$notifications",
            preserveNullAndEmptyArrays: true,
          },
        },
        { $sort: { "notifications.date": -1 } },
        {
          $group: {
            _id: "$_id",
            uid: { $first: "$uid" },
            username: { $first: "$username" },
            displayName: { $first: "$displayName" },
            email: { $first: "$email" },
            phoneNumber: { $first: "$phoneNumber" },
            photoURL: { $first: "$photoURL" },
            hometownId: { $first: "$hometownId" },
            preferences: { $first: "$preferences" },
            followingUids: { $first: "$followingUids" },
            favoriteCityIds: { $first: "$favoriteCityIds" },
            hiddenCityIds: { $first: "$hiddenCityIds" },
            notifications: { $push: "$notifications" },
            visitedCityIds: { $first: "$visitedCityIds" },
          },
        },
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
        tripsQuery("upcomingTrips"),
        tripsQuery("pastTrips"),
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

// This endpoint takes in an array of uids, and returns an array of UserProfiles that exclude the original array
userRouter.get("/suggestions/:excludedUids", async (req, res) => {
  try {
    const client = await getClient();
    const excludedUids: string[] = req.params.excludedUids.split(",");
    const results = await client
      .db()
      .collection<UserProfile>("users")
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
      .collection<UserProfile>("users")
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
      .collection<UserProfile>("users")
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

// This endpoint takes in a UserProfile object and adds it to the database
userRouter.post("/", async (req, res) => {
  try {
    const client = await getClient();
    const newUser: UserProfile = req.body.newUser;
    await client.db().collection<UserProfile>("users").insertOne(newUser);
    res.status(201).json("Profile Successfully Added!");
  } catch (err) {
    errorResponse(err, res);
  }
});

// This endpoint deletes a UserProfile from the database
userRouter.delete("/:uid", async (req, res) => {
  try {
    const uid: string = req.params.uid;
    const trips: TripSummary[] = req.body.trips;
    const visitedCities: City[] = req.body.visitedCities;
    const client = await getClient();

    // deletes user from documents
    await client.db().collection<UserProfile>("users").deleteOne({ uid });

    // deletes uid from other users' followingUids
    await client
      .db()
      .collection<UserProfile>("users")
      .updateMany({ followingUids: uid }, { $pull: { followingUids: uid } });

    // deletes uid from all trip likes
    await client
      .db()
      .collection<Trip>("trips")
      .updateMany({ likesUids: uid }, { $pull: { likesUids: uid } });

    // deletes all comments with user uid
    await client
      .db()
      .collection<Trip>("trips")
      .updateMany(
        { comments: { $elemMatch: { uid } } },
        { $pull: { comments: { uid } } }
      );

    // deletes all notifications with user uid
    await client
      .db()
      .collection<UserProfile>("users")
      .updateMany(
        { notifications: { $elemMatch: { uid } } },
        { $pull: { notifications: { uid } } }
      );

    // delete user from trips
    trips.forEach((trip) => {
      const acceptedParticipants: ParticipantSummary[] =
        trip.participants.filter((participant) => participant.accepted);

      if (acceptedParticipants.length === 1) {
        // deletes trip if user is the only participant
        client
          .db()
          .collection<Trip>("trips")
          .deleteOne({ _id: new ObjectId(trip._id) });
      } else {
        // removes participant from the trip
        client
          .db()
          .collection<Trip>("trips")
          .updateOne(
            { _id: new ObjectId(trip._id) },
            { $pull: { participants: { uid } } }
          );

        // reassigns creatorUid if user was creator but there are other participants
        if (trip.creator.uid === uid) {
          const newCreator: string | undefined = acceptedParticipants.find(
            (participant) => participant.user.uid != uid
          )?.user.uid;

          if (newCreator) {
            client
              .db()
              .collection<Trip>("trips")
              .updateOne(
                { _id: new ObjectId(trip._id) },
                { $set: { creatorUid: newCreator } }
              );
          }
        }
      }
    });

    // delete user from visited cities
    visitedCities.forEach((city) => {
      client
        .db()
        .collection<City>("cities")
        .updateOne(
          { _id: new ObjectId(city._id) },
          { $pull: { visitorsUids: uid } }
        );
      client
        .db()
        .collection<City>("cities")
        .updateOne(
          { _id: new ObjectId(city._id) },
          { $pull: { ratings: { uid } } }
        );
    });
    res.sendStatus(204);
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
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $push: { followingUids: newFollowing } });

    await addNotificationQuery(
      client,
      newFollowing,
      uid,
      "follow",
      currentDateString,
      null
    );

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
      .collection<UserProfile>("users")
      .updateOne({ uid: userUid }, { $pull: { followingUids: otherUid } });
    res.status(200).json("Success");
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
      .collection<UserProfile>("users")
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
        .collection<UserProfile>("users")
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
        .collection<UserProfile>("users")
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
      .collection<UserProfile>("users")
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
      .collection<UserProfile>("users")
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
      .collection<UserProfile>("users")
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
      .collection<UserProfile>("users")
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
      .collection<UserProfile>("users")
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
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $pull: { favoriteCityIds: cityId } });
    res.status(200).json(cityId);
  } catch (err) {
    errorResponse(err, res);
  }
});

export default userRouter;
