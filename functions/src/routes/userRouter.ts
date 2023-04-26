import express from "express";
import { ObjectId } from "mongodb";
import { getClient } from "../db";
import UserProfile, { Notification } from "../models/UserProfile";

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

userRouter.get("/:uid/followers", async (req, res) => {
  try {
    const uid: string = req.params.uid;
    const client = await getClient();
    const result = await client
      .db()
      .collection<UserProfile>("users")
      .find({ followingUids: uid })
      .toArray();
    res.status(200).json(result);
  } catch (err) {
    errorResponse(err, res);
  }
});

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
      .limit(3)
      .toArray();
    res.status(200).json(results);
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
      });
    const result = await cursor.toArray();
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

userRouter.delete("/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string = req.params.uid;
    await client.db().collection<UserProfile>("users").deleteOne({ uid });
    res.sendStatus(204);
  } catch (err) {
    errorResponse(err, res);
  }
});

userRouter.put("/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string = req.params.uid;
    const userProfile: UserProfile = req.body;

    userProfile._id = new ObjectId(userProfile._id);

    await client
      .db()
      .collection<UserProfile>("users")
      .replaceOne({ uid }, userProfile);
    res.status(200).json(userProfile);
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

userRouter.put("/:uid/remove-all-user-followings", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string = req.params.uid;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateMany({ followingUids: uid }, { $pull: { followingUids: uid } });
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

userRouter.put("/:uid/visit-city/:cityId", async (req, res) => {
  try {
    const client = await getClient();
    const uid: string | undefined = req.params.uid;
    const cityId: string = req.params.cityId;
    await client
      .db()
      .collection<UserProfile>("users")
      .updateOne({ uid }, { $push: { visitedCityIds: cityId } });
    res.status(200).json(cityId);
  } catch (err) {
    errorResponse(err, res);
  }
});

export default userRouter;
