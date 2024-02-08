import * as functions from "firebase-functions";
import express from "express";
import axios from "axios";
import { ObjectId } from "mongodb";
import { getClient } from "../db";

import Trip, { Comment, Message, Participant } from "../models/Trip";
import AmadeusResponse, { Hotel } from "../models/AmadeusResponse";
import { addNotificationQuery } from "../queries/userQueries";

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

tripRouter.post(
  "/:uid/:cityId/:cityName/:cityCode/:startDate/:endDate",
  async (req, res) => {
    try {
      const client = await getClient();

      const uid: string = req.params.uid;
      const cityId: string = req.params.cityId;
      const cityName: string = req.params.cityName;
      const cityCode: string = req.params.cityCode;
      const startDate: string = req.params.startDate;
      const endDate: string = req.params.endDate;

      const newTrip: Trip = {
        creatorUid: uid,
        cityId,
        nickname: "",
        startDate,
        endDate,
        hotel: null,
        schedule: [],
        photos: [],
        participants: [{ uid, accepted: true }],
        messages: [],
        completed: false,
        likesUids: [],
        comments: [],
      };

      // duration to see how many days and if hotel is needed
      const duration: number =
        endDate !== startDate
          ? (Number(endDate) - Number(startDate)) / (1000 * 3600 * 24) + 1
          : 1;

      // schedule maker from yelp
      const yelpKey: string = functions.config().yelp.key;
      const schedule = [];

      const breakfastOptions = (
        await axios.get("https://api.yelp.com/v3/businesses/search", {
          params: {
            location: cityName,
            limit: 50,
            categories: "breakfast_brunch",
            price: 1,
          },
          headers: {
            Authorization: `Bearer ${yelpKey}`,
          },
        })
      ).data.businesses;

      const lunchAndDinnerOptions = (
        await axios.get("https://api.yelp.com/v3/businesses/search", {
          params: {
            location: cityName,
            limit: 50,
            categories: "restaurants",
            price: 1,
          },
          headers: {
            Authorization: `Bearer ${yelpKey}`,
          },
        })
      ).data.businesses;

      const eventOptions = (
        await axios.get("https://api.yelp.com/v3/businesses/search", {
          params: {
            location: cityName,
            limit: 50,
            categories: "arts",
          },
          headers: {
            Authorization: `Bearer ${yelpKey}`,
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

      newTrip.schedule = schedule;

      // hotel getter if duration > 1
      if (duration > 1) {
        let token: string | null = null;
        const id: string = functions.config().amadeus.id;
        const secret: string = functions.config().amadeus.secret;

        if (!token) {
          token = (
            await axios.post(
              "https://test.api.amadeus.com/v1/security/oauth2/token",
              `grant_type=client_credentials&client_id=${id}&client_secret=${secret}`,
              {
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
              }
            )
          ).data.access_token;
        }

        const amadeusHotels: AmadeusResponse = (
          await axios.get(
            "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city",
            {
              params: { cityCode, ratings: "1,2", radius: 30 },
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        ).data;

        const hotels: Hotel[] = amadeusHotels.data;

        const hotelIndex: number = Math.floor(Math.random()) * hotels.length;

        newTrip.hotel = hotels[hotelIndex].name;
      }

      await client.db().collection<Trip>("trips").insertOne(newTrip);
      res.status(200).json(newTrip._id?.toString());
    } catch (err) {
      errorResponse(err, res);
    }
  }
);

tripRouter.delete("/:tripId", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string = req.params.tripId;
    await client
      .db()
      .collection<Trip>("trips")
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
      .collection<Trip>("trips")
      .updateOne({ _id: new ObjectId(tripId) }, { $set: { nickname } });
    res.status(200).json(nickname);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/new-participant/:tripId/:friend/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const friend: string | undefined = req.params.friend;
    const uid: string | undefined = req.params.uid;
    const newParticipant: Participant = { uid: friend, accepted: false };
    const currentDateString: string = new Date().getTime().toString();

    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $push: { participants: newParticipant } }
      );

    await addNotificationQuery(
      client,
      friend,
      uid,
      "tripRequest",
      currentDateString,
      tripId
    );

    res.status(200);
    res.json(newParticipant);
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/accept-trip/:tripId/:uid/:otherUid", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string = req.params.tripId;
    const uid: string = req.params.uid;
    const otherUid: string = req.params.otherUid;
    const currentDateString: string = new Date().getTime().toString();

    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $set: { [`participants.$[participant].accepted`]: true } },
        { arrayFilters: [{ "participant.uid": uid }] }
      );

    await addNotificationQuery(
      client,
      otherUid,
      uid,
      "tripAccept",
      currentDateString,
      tripId
    );

    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put(
  "/remove-participant/:tripId/:uid/:otherUid",
  async (req, res) => {
    try {
      const client = await getClient();
      const tripId: string | undefined = req.params.tripId;
      const uid: string | undefined = req.params.uid;
      const otherUid: string | undefined = req.params.otherUid;
      const currentDateString: string = new Date().getTime().toString();

      await client
        .db()
        .collection<Trip>("trips")
        .updateOne(
          { _id: new ObjectId(tripId) },
          { $pull: { participants: { uid } } }
        );

      await addNotificationQuery(
        client,
        otherUid,
        uid,
        "tripDecline",
        currentDateString,
        tripId
      );

      res.status(200).json("Success");
    } catch (err) {
      errorResponse(err, res);
    }
  }
);

tripRouter.put("/new-message/:tripId/:uid", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const uid: string | undefined = req.params.uid;
    const newMessage: Message = req.body;
    const currentDateString: string = new Date().getTime().toString();

    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $push: { messages: newMessage } }
      );

    const trip = await client
      .db()
      .collection<Trip>("trips")
      .findOne(
        { _id: new ObjectId(tripId) },
        { projection: { participants: 1 } }
      );

    trip?.participants.forEach((participant) => {
      addNotificationQuery(
        client,
        participant.uid,
        uid,
        "tripMessage",
        currentDateString,
        tripId
      );
    });

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
      .collection<Trip>("trips")
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
      .collection<Trip>("trips")
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
      .collection<Trip>("trips")
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
      .collection<Trip>("trips")
      .updateOne({ _id: new ObjectId(tripId) }, { $pull: { likesUids: uid } });
    res.status(200).json("Success");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/comment-trip/:tripId/:uid/:date", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const uid: string | undefined = req.params.uid;
    const date: string | undefined = req.params.date;
    const comment: string = req.body.comment;
    const newComment: Comment = {
      uid,
      comment,
      date,
    };
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $push: { comments: newComment } }
      );
    res.status(200).json("Successfully added comment to trip.");
  } catch (err) {
    errorResponse(err, res);
  }
});

tripRouter.put("/remove-comment-trip/:tripId/:uid/:date", async (req, res) => {
  try {
    const client = await getClient();
    const tripId: string | undefined = req.params.tripId;
    const uid: string | undefined = req.params.uid;
    const date: string | undefined = req.params.date;
    const comment: string = req.body.comment;
    await client
      .db()
      .collection<Trip>("trips")
      .updateOne(
        { _id: new ObjectId(tripId) },
        { $pull: { comments: { uid, comment, date } } }
      );
    res.status(200).json("Successfully removed comment from trip");
  } catch (err) {
    errorResponse(err, res);
  }
});

export default tripRouter;
