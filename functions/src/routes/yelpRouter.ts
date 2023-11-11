// require the express module
import * as functions from "firebase-functions";
import express from "express";
import axios from "axios";

// create a new Router object
const yelpRouter = express.Router();
const key: string = functions.config().yelp.key;

yelpRouter.get("/schedule/:location/:duration", async (req, res) => {
  const location: string = req.params.location;
  const duration: number = Number(req.params.duration);
  const schedule = [];

  const breakfastOptions = (
    await axios.get("https://api.yelp.com/v3/businesses/search", {
      params: {
        location,
        limit: 50,
        categories: "breakfast_brunch",
        price: 1,
      },
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })
  ).data.businesses;

  const lunchAndDinnerOptions = (
    await axios.get("https://api.yelp.com/v3/businesses/search", {
      params: {
        location,
        limit: 50,
        categories: "restaurants",
        price: 1,
      },
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })
  ).data.businesses;

  const eventOptions = (
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
  ).data.businesses;

  for (let i = 0; i < duration; i++) {
    const breakfastIndex: number = Math.floor(
      Math.random() * breakfastOptions.length
    );
    let lunchAndDinnerIndex: number = Math.floor(
      Math.random() * lunchAndDinnerOptions.length
    );
    let activitiesIndex: number = Math.floor(
      Math.random() * eventOptions.length
    );

    const breakfast = breakfastOptions[breakfastIndex];
    breakfastOptions.splice(breakfastIndex, 1);

    const lunch = lunchAndDinnerOptions[lunchAndDinnerIndex];
    lunchAndDinnerOptions.splice(lunchAndDinnerIndex, 1);
    lunchAndDinnerIndex = Math.floor(
      Math.random() * lunchAndDinnerOptions.length
    );

    const dinner = lunchAndDinnerOptions[lunchAndDinnerIndex];
    lunchAndDinnerOptions.splice(lunchAndDinnerIndex, 1);

    const firstActivity = eventOptions[activitiesIndex];
    eventOptions.splice(activitiesIndex, 1);
    activitiesIndex = Math.floor(Math.random() * eventOptions.length);

    const secondActivity = eventOptions[activitiesIndex];
    eventOptions.splice(activitiesIndex, 1);

    schedule.push({
      breakfast: breakfast.name,
      breakfastPhoto: breakfast.image_url,
      breakfastAddress: breakfast.location.display_address,
      breakfastPhone: breakfast.display_phone,
      breakfastUrl: breakfast.url,
      lunch: lunch.name,
      lunchPhoto: lunch.image_url,
      lunchAddress: lunch.location.display_address,
      lunchPhone: lunch.display_phone,
      lunchURL: lunch.url,
      dinner: dinner.name,
      dinnerPhoto: dinner.image_url,
      dinnerAddress: dinner.location.display_address,
      dinnerPhone: dinner.display_phone,
      dinnerUrl: dinner.url,
      event1: firstActivity.name,
      event1Photo: firstActivity.image_url,
      event1Address: firstActivity.location.display_address,
      event1Phone: firstActivity.display_phone,
      event1Url: firstActivity.url,
      event2: secondActivity.name,
      event2Photo: secondActivity.image_url,
      event2Address: secondActivity.location.display_address,
      event2Phone: secondActivity.display_phone,
      event2Url: secondActivity.url,
    });
  }

  res.status(200).json(schedule);
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
