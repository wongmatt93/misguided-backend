import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";
import userRouter from "./routes/userRouter";
import cityRouter from "./routes/cityRouter";
import tripRouter from "./routes/tripRouter";
import yelpRouter from "./routes/yelpRouter";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/users", userRouter);
app.use("/cities", cityRouter);
app.use("/trips", tripRouter);
app.use("/yelp", yelpRouter);

export const api = functions.https.onRequest(app);
