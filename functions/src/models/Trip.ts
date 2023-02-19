import { ObjectId } from "mongodb";

export interface Like {
  uid: string;
}

export interface Comment {
  uid: string;
  comment: string;
  date: string;
}

export interface Participant {
  uid: string;
}

interface SingleDaySchedule {
  breakfast: string;
  breakfastPhoto: string;
  breakfastAddress: string[];
  breakfastPhone: string;
  breakfastUrl: string;
  lunch: string;
  lunchPhoto: string;
  lunchAddress: string[];
  lunchPhone: string;
  lunchURL: string;
  dinner: string;
  dinnerPhoto: string;
  dinnerAddress: string[];
  dinnerPhone: string;
  dinnerUrl: string;
  event1: string;
  event1Photo: string;
  event1Address: string[];
  event1Phone: string;
  event1Url: string;
  event2: string;
  event2Photo: string;
  event2Address: string[];
  event2Phone: string;
  event2Url: string;
}

export default interface Trip {
  _id?: ObjectId;
  creatorUid: string;
  date1: string;
  date2: string;
  cityName: string;
  cityPhoto: string;
  hotel: string | null;
  schedule: SingleDaySchedule[];
  photos: string[];
  participants: Participant[];
  completed: boolean;
  likes: Like[];
  comments: Comment[];
}
