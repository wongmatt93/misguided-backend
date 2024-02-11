import { UserProfile, Notification } from "../models/UserProfile";
import { MongoClient } from "mongodb";
import { currentDateString } from "../utils/dateFunctions";

export const tripsQuery = (tripType: string) => {
  return {
    $lookup: {
      from: "trips",
      let: { uid: "$uid" },
      pipeline: [
        {
          $match: {
            endDate:
              tripType === "upcomingTrips"
                ? { $gt: currentDateString }
                : { $lt: currentDateString },
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
            let: { likesUids: "$likesUids" },
            pipeline: [
              { $match: { $expr: { $in: ["$uid", "$$likesUids"] } } },
              {
                $project: {
                  uid: 1,
                  username: 1,
                  displayName: 1,
                  photoURL: 1,
                },
              },
            ],
            as: "likes",
          },
        },
        { $sort: { startDate: 1 } },
        {
          $project: {
            cityId: 0,
            creatorUid: 0,
            likesUids: 0,
            "participants.user.notifications": 0,
            "participants.user.preferences": 0,
            "participants.user.favoriteCityIds": 0,
            "participants.user.followingUids": 0,
            "participants.user.hiddenCityIds": 0,
            "participants.user.hometownId": 0,
            "participants.user.phoneNumber": 0,
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
          },
        },
      ],
      as: tripType,
    },
  };
};

export const addNotificationQuery = async (
  client: MongoClient,
  uid: string,
  notifUserUid: string,
  type: string,
  date: string,
  tripId: string | null
) => {
  const notification: Notification = {
    uid: notifUserUid,
    type,
    date,
    read: false,
    tripId,
  };

  await client
    .db()
    .collection<UserProfile>("users")
    .updateOne({ uid }, { $push: { notifications: notification } });
};
