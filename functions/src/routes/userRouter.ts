import express from "express";
import { getClient } from "../db";
import UserProfile, {
  Notification,
  Preferences,
  UserTrip,
} from "../models/UserProfile";

const userRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

userRouter.get("/", async (req, res) => {
  try {
    const client = await getClient();
    const cursor = client.db().collection<UserProfile>("users").find();
    const results = await cursor.toArray();
    res.status(200).json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.get("/users-by-uid/:uids", async (req, res) => {
  try {
    const uids: string[] = req.params.uids.split(",");
    const client = await getClient();
    const cursor = client
      .db()
      .collection<UserProfile>("users")
      .find({ uid: { $in: uids } });
    const results = await cursor.toArray();
    res.status(200).json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.get("/:uid/uid", async (req, res) => {
  try {
    const uid: string = req.params.uid;
    const client = await getClient();
    const result = await client
      .db()
      .collection<UserProfile>("users")
      .findOne({ uid });
    res.status(200).json(result);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.get("/:username/username", async (req, res) => {
  try {
    const username: string = req.params.username;
    const client = await getClient();
    const result = await client
      .db()
      .collection<UserProfile>("users")
      .findOne({
        username: {
          $regex: username,
          $options: "i",
        },
      });
    res.status(200).json(result);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.post("/", async (req, res) => {
  try {
    const newProfile: UserProfile = req.body;
    const client = await getClient();
    await client.db().collection<UserProfile>("users").insertOne(newProfile);
    res.status(201).json(newProfile);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/update-username", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const username: string | undefined = req.body.username;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $set: { username } });
    res.status(200).json(username);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/update-phone", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const phoneNumber: string | undefined = req.body.phoneNumber;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $set: { phoneNumber } });
    res.status(200).json(phoneNumber);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/update-photo", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const photoURL: string | undefined = req.body.photoURL;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $set: { photoURL } });
    res.status(200).json(photoURL);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/update-hometown", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const hometownId: string | undefined = req.body.hometownId;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $set: { hometownId } });
    res.status(200).json(hometownId);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/likes", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const newCity: string = req.body.newCity;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $push: { likesCityIds: newCity } });
    res.status(200).json(newCity);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/:cityId/remove-like", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const cityId: string | undefined = req.params.cityId;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $pull: { likesCityIds: cityId } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/dislikes", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const newCity: string = req.body.newCity;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $push: { dislikesCityIds: newCity } });
    res.status(200).json(newCity);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/remove-all-dislikes", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $set: { dislikesCityIds: [] } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/:otherUid/add-following", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const newFollowing: string | undefined = req.params.otherUid;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $push: { followingUids: newFollowing } });
    res.status(200).json(newFollowing);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/:otherUid/add-follower", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const newFollower: string | undefined = req.params.otherUid;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $push: { followersUids: newFollower } });
    res.status(200).json(newFollower);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:userUid/:otherUid/remove-following", async (req, res) => {
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

userRouter.put("/:userUid/:otherUid/remove-follower", async (req, res) => {
  try {
    const client = await getClient();
    const userUid: string | undefined = req.params.userUid;
    const otherUid: string | undefined = req.params.otherUid;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid: userUid }, { $pull: { followersUids: otherUid } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/preferences", async (req, res) => {
  try {
    const uid: string = req.params.uid;
    const preferences: Preferences = req.body;
    const client = await getClient();
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $set: { preferences } });
    res.status(200).json(preferences);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/add-trip", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const newTrip: UserTrip = req.body;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $push: { trips: newTrip } });
    res.status(200).json(newTrip);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/:tripId/accept-trip", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const tripId: string | undefined = req.params.tripId;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne(
        { uid },
        { $set: { [`trips.$[trip].accepted`]: true } },
        { arrayFilters: [{ "trip.tripId": tripId }] }
      );
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/:tripId/delete-trip", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const tripId: string | undefined = req.params.tripId;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $pull: { trips: { tripId } } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/add-notification", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const newNotification: Notification = req.body;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $push: { notifications: newNotification } });
    res.status(200).json(newNotification);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid/:notifUid/:date/read-notification", async (req, res) => {
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
  "/:uid/:notifUid/:date/unread-notification",
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
  "/:uid/:notifUid/:date/delete-notification",
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

userRouter.put("/:uid/delete-all-notifications", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $pull: { notifications: {} } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

export default userRouter;
