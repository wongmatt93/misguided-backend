import { ObjectId } from "mongodb";

export interface UserTrip {
  tripId: string;
  accepted: boolean;
}

export interface CityVote {
  cityId: string;
  cityName: string;
  photo: string;
}

export interface Follow {
  uid: string;
}

export interface Notification {
  uid: string;
  type: string;
  date: string;
  read: boolean;
}

export interface Preferences {
  charming: boolean;
  foodie: boolean;
  nightlife: boolean;
  architecture: boolean;
  history: boolean;
  museums: boolean;
  performingArts: boolean;
  music: boolean;
  hipster: boolean;
  hippie: boolean;
  posh: boolean;
  familyFriendly: boolean;
  lGBTScene: boolean;
  diversity: boolean;
  beachTown: boolean;
  collegeTown: boolean;
  skiTown: boolean;
  outdoorsy: boolean;
  wineries: boolean;
  shopping: boolean;
}

export default interface UserProfile {
  _id?: ObjectId;
  uid: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  hometownUid: string | null;
  preferences: Preferences | null;
  followers: Follow[];
  following: Follow[];
  likes: CityVote[];
  dislikes: CityVote[];
  trips: UserTrip[];
  notifications: Notification[];
}
