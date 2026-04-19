import mongoose from "mongoose";
import dotenv from "dotenv";
import AdminJS from "adminjs";
import { Database, Resource } from "@adminjs/mongoose";
AdminJS.registerAdapter({ Database, Resource });
dotenv.config();
const env = process.env.NODE_ENV ?? "development";
const MONGO_URI_LOCAL = process.env.MONGO_URI_LOCAL;
const MONGO_URI = process.env.MONGO_URI;
let MONGODB;
if (env === "production") {
    console.log("Using production MongoDB");
    if (!MONGO_URI) {
        throw new Error("MONGO_URI must be set in production");
    }
    MONGODB = MONGO_URI;
}
else {
    console.log("Using local MongoDB for development");
    MONGODB = MONGO_URI_LOCAL ?? "mongodb://127.0.0.1:27017/taxchat";
}
export const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB);
        console.log("MongoDB connected");
    }
    catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
};
export default mongoose;
