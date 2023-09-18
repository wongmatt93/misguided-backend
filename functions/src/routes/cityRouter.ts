import express from "express";
import { ObjectId } from "mongodb";
import { getClient } from "../db";
import City, { Rating } from "../models/City";

const cityRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

// gets all cities
cityRouter.get("/", async (req, res) => {
  try {
    const client = await getClient();
    const cursor = client
      .db()
      .collection<City>("cities")
      .aggregate([
        {
          $lookup: {
            from: "users",
            let: { visitorsUids: "$visitorsUids" },
            pipeline: [
              { $match: { $expr: { $in: ["$uid", "$$visitorsUids"] } } },
              {
                $project: { uid: 1, username: 1, displayName: 1, photoURL: 1 },
              },
            ],
            as: "visitors",
          },
        },
        { $project: { visitorsUids: 0 } },
        { $sort: { cityName: 1 } },
      ]);
    const results = await cursor.toArray();
    res.status(200).json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

cityRouter.get("/:cityId", async (req, res) => {
  try {
    const cityId: string = req.params.cityId;
    const client = await getClient();
    const results = await client
      .db()
      .collection<City>("cities")
      .findOne({ _id: new ObjectId(cityId) });
    res.status(200).json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

cityRouter.post("/", async (req, res) => {
  try {
    const newCity: City = req.body;
    const client = await getClient();
    await client.db().collection<City>("cities").insertOne(newCity);
    res.status(200).json(newCity);
  } catch (err) {
    errorResponse(err, res);
  }
});

cityRouter.put("/:cityId/new-rating", async (req, res) => {
  try {
    const client = await getClient();
    const cityId: string | undefined = req.params.cityId;
    const newRating: Rating = req.body;
    await client
      .db()
      .collection<City>("cities")
      .updateOne(
        { _id: new ObjectId(cityId) },
        { $push: { ratings: newRating } }
      );
    res.status(200).json(newRating);
  } catch (err) {
    errorResponse(err, res);
  }
});

cityRouter.put("/:cityId/:uid/:rating/update-rating", async (req, res) => {
  try {
    const client = await getClient();
    const cityId: string | undefined = req.params.cityId;
    const uid: string | undefined = req.params.uid;
    const rating: string | undefined = req.params.rating;
    await client
      .db()
      .collection<City>("cities")
      .updateOne(
        { _id: new ObjectId(cityId) },
        { $set: { [`ratings.$[rating].rating`]: Number(rating) } },
        { arrayFilters: [{ "rating.uid": uid }] }
      );
    res.status(200).json("success");
  } catch (err) {
    errorResponse(err, res);
  }
});

cityRouter.put("/remove-rating/:cityId/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const cityId: string | undefined = req.params.cityId;
    const uid: string = req.params.uid;
    await client
      .db()
      .collection<City>("cities")
      .updateOne(
        { _id: new ObjectId(cityId) },
        { $pull: { ratings: { uid } } }
      );
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

cityRouter.put("/:cityId/add-visitor/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const cityId: string | undefined = req.params.cityId;
    const newVisitor: string = req.params.uid;
    await client
      .db()
      .collection<City>("cities")
      .updateOne(
        { _id: new ObjectId(cityId) },
        { $push: { visitorsUids: newVisitor } }
      );
    res.status(200).json(newVisitor);
  } catch (err) {
    errorResponse(err, res);
  }
});

cityRouter.put("/remove-visitor/:cityId/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const cityId: string | undefined = req.params.cityId;
    const uid: string = req.params.uid;
    await client
      .db()
      .collection<City>("cities")
      .updateOne(
        { _id: new ObjectId(cityId) },
        { $pull: { visitorsUids: uid } }
      );
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

export default cityRouter;
