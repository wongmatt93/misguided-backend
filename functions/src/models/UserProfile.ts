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

export interface Friend {
  uid: string;
  displayName: string;
  photoURL: string | null;
  friendRequestStatus: string;
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
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  hometownUid: string | null;
  preferences: Preferences | null;
  friends: Friend[];
  likes: CityVote[];
  dislikes: CityVote[];
  trips: UserTrip[];
}
