import mongoose from "mongoose";
import dotenv from "dotenv";
import AdminJS from "adminjs";
import { Database, Resource } from "@adminjs/mongoose";

console.log('[mongoose::module] ENTER', { loading: true });

AdminJS.registerAdapter({ Database, Resource });
console.log('[mongoose::module] branch: AdminJS adapter registered');

dotenv.config();
console.log('[mongoose::module] branch: dotenv configured');

const env = process.env.NODE_ENV ?? "development";
const MONGO_URI_LOCAL = process.env.MONGO_URI_LOCAL;
const MONGO_URI = process.env.MONGO_URI;

console.log('[mongoose::module] branch: env resolved', { env });

let MONGODB: string;
if (env === "production") {
  console.log('[mongoose::module] branch: production environment');
  console.log("Using production MongoDB");
  if (!MONGO_URI) {
    console.log('[mongoose::module] branch: MONGO_URI missing in production');
    console.log('[mongoose::module] EXIT', { error: 'MONGO_URI missing' });
    throw new Error("MONGO_URI must be set in production");
  }
  console.log('[mongoose::module] branch: MONGO_URI present in production');
  MONGODB = MONGO_URI;
} else {
  console.log('[mongoose::module] branch: non-production environment');
  console.log("Using local MongoDB for development");
  MONGODB = MONGO_URI_LOCAL ?? "mongodb://127.0.0.1:27017/taxchat";
}

console.log('[mongoose::module] EXIT', { hasUri: !!MONGODB });

export const connectDB = async (): Promise<void> => {
  console.log('[mongoose::connectDB] ENTER', {});
  try {
    console.log('[mongoose::connectDB] branch: try connect');
    await mongoose.connect(MONGODB);
    console.log("MongoDB connected");
    console.log('[mongoose::connectDB] EXIT', { connected: true });
  } catch (err) {
    console.log('[mongoose::connectDB] branch: catch connection error');
    console.error("MongoDB connection error:", err);
    console.log('[mongoose::connectDB] EXIT', { connected: false, exiting: true });
    process.exit(1);
  }
};

export default mongoose;
