import { ObjectId } from "mongodb";

export interface Rating {
  uid: string;
  rating: number;
}

export default interface City {
  _id?: ObjectId;
  cityName: string;
  cityDescription: string;
  cityCode: string;
  latitude: string;
  longitude: string;
  country: string;
  knownFor: string[];
  photoURL: string;
  ratings: Rating[];
  visitorsUids: string[];
}
