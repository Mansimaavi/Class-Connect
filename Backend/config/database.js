import mongoose from "mongoose";
import env from "./env.js";
import logger from "../utils/logger.js";

mongoose.set("strictQuery", true);

export const connectDB = async (uri = env.mongoUri) => {
  if (!uri) throw new Error("MONGO_URI is not set");
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
  });
  logger.info({ db: mongoose.connection.name }, "connected to MongoDB");
  return mongoose.connection;
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
};

export const isDatabaseReady = () => mongoose.connection.readyState === 1;

mongoose.connection.on("disconnected", () => {
  if (!env.isTest) logger.warn("MongoDB disconnected");
});
mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
