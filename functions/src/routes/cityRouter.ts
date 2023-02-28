import express from "express";
import { ObjectId } from "mongodb";
import { getClient } from "../db";
import City, { Rating, Visitor } from "../models/City";

const cityRouter = express.Router();

const errorResponse = (error: any, res: any) => {
  console.error("FAIL", error);
  res.status(500).json({ message: "Internal Server Error" });
};

cityRouter.get("/", async (req, res) => {
  try {
    const client = await getClient();
    const cursor = client.db().collection<City>("cities").find();
    const results = await cursor.toArray();
    res.json(results);
  } catch (err) {
    errorResponse(err, res);
  }
});

cityRouter.get("/:id", async (req, res) => {
  try {
    const id: string = req.params.id;
    const client = await getClient();
    const results = await client
      .db()
      .collection<City>("cities")
      .findOne({ _id: new ObjectId(id) });
    res.json(results);
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

cityRouter.put("/:id/new-rating", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const newRating: Rating = req.body;
    await client
      .db()
      .collection<City>("cities")
      .updateOne({ _id: new ObjectId(id) }, { $push: { ratings: newRating } });
    res.status(200);
    res.json(newRating);
  } catch (err) {
    errorResponse(err, res);
  }
});

cityRouter.put("/:id/:uid/:rating/update-rating", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const uid: string | undefined = req.params.uid;
    const rating: string | undefined = req.params.rating;
    await client
      .db()
      .collection<City>("cities")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { [`ratings.$[rating].rating`]: Number(rating) } },
        { arrayFilters: [{ "rating.uid": uid }] }
      );
    res.status(200);
    res.json("success");
  } catch (err) {
    errorResponse(err, res);
  }
});

cityRouter.put("/:id/add-visitor", async (req, res) => {
  try {
    const client = await getClient();
    const id: string | undefined = req.params.id;
    const newVisitor: Visitor = req.body;
    await client
      .db()
      .collection<City>("cities")
      .updateOne(
        { _id: new ObjectId(id) },
        { $push: { visitors: newVisitor } }
      );
    res.status(200);
    res.json(newVisitor);
  } catch (err) {
    errorResponse(err, res);
  }
});

export default cityRouter;
