import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, inject } from "vitest";

/**
 * Gives each test file its own throwaway database and empties every
 * collection before each test (indexes are kept, so unique constraints apply).
 */
export const useTestDatabase = () => {
  beforeAll(async () => {
    await mongoose.connect(inject("mongoUri"), { dbName: `cc_test_${randomUUID().slice(0, 8)}` });
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
};
