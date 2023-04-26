import { ObjectId } from "mongodb";

export interface Notification {
  uid: string;
  type: string;
  date: string;
  read: boolean;
  tripId: string;
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
  followingUids: string[];
  favoriteCityIds: string[];
  hiddenCityIds: string[];
  notifications: Notification[];
  visitedCityIds: string[];
}
