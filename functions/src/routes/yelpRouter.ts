// require the express module
import * as functions from "firebase-functions";
import express from "express";
import axios from "axios";

// create a new Router object
const yelpRouter = express.Router();
const key: string = functions.config().yelp.key;

yelpRouter.get("/restaurants", async (req, res) => {
  const { location } = req.query;
  const results = (
    await axios.get("https://api.yelp.com/v3/businesses/search", {
      params: {
        location,
        limit: 50,
        categories: "restaurants",
        term: "nasty, dirty, disgusting, filthy, smells, gross, awful, stinks",
      },
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })
  ).data;
  res.status(200).json(results);
});

yelpRouter.get("/arts", async (req, res) => {
  const { location } = req.query;
  const results = (
    await axios.get("https://api.yelp.com/v3/businesses/search", {
      params: {
        location,
        limit: 50,
        categories: "arts",
      },
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })
  ).data;
  res.status(200).json(results);
});

yelpRouter.get("/breakfast", async (req, res) => {
  const { location } = req.query;
  const results = (
    await axios.get("https://api.yelp.com/v3/businesses/search", {
      params: {
        location,
        limit: 50,
        categories: "breakfast_brunch",
        term: "nasty, dirty, disgusting, filthy, smells, gross, awful, stinks",
      },
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })
  ).data;
  res.status(200).json(results);
});

yelpRouter.get("/business/:id", async (req, res) => {
  const id = req.params.id;
  const results = (
    await axios.get(`https://api.yelp.com/v3/businesses/${id}`, {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })
  ).data;
  res.status(200).json(results);
});

export default yelpRouter;
