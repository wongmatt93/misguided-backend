import { ObjectId } from "mongodb";

export interface UserSummary {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
}

export interface CitySummary {
  _id: string;
  cityName: string;
  photoURL: string;
  visitors: UserSummary[];
}

export interface Comment {
  uid: string;
  comment: string;
  date: string;
}

export interface Message {
  uid: string;
  text: string;
  date: string;
}

export interface NewParticipant {
  uid: string;
  accepted: boolean;
}

export interface Participant {
  user: UserSummary;
  accepted: boolean;
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

export default interface NewTrip {
  _id?: ObjectId;
  cityId: string;
  creatorUid: string;
  nickname: string;
  startDate: string;
  endDate: string;
  hotel: string | null;
  schedule: SingleDaySchedule[];
  photos: string[];
  participants: NewParticipant[];
  messages: Message[];
  completed: boolean;
  likesUids: string[];
  comments: Comment[];
}

export interface Trip {
  _id?: string;
  creator: UserSummary;
  city: CitySummary;
  nickname: string;
  startDate: string;
  endDate: string;
  hotel: string | null;
  schedule: SingleDaySchedule[];
  photos: string[];
  participants: Participant[];
  messages: Message[];
  completed: boolean;
  likes: UserSummary[];
  comments: Comment[];
}
