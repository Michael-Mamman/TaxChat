import mongoose from "mongoose";

// Importing the models registers their schemas and indexes.
import "../../src/models/taxpayer.model.js";
import "../../src/models/session.model.js";
import "../../src/models/otp.model.js";
import "../../src/models/conversationContext.model.js";
import "../../src/models/serviceRequest.model.js";
import "../../src/models/notification.model.js";
import "../../src/models/auditLog.model.js";

const TEST_DB = "taxchat_test";

export async function connectTestDb(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI_LOCAL as string);
  }
  // Guard against ever pointing the suite at the dev or production database:
  // resetDb() deletes every document it can see.
  if (mongoose.connection.name !== TEST_DB) {
    throw new Error(
      `Refusing to run tests against database "${mongoose.connection.name}" - expected "${TEST_DB}"`,
    );
  }
}

/**
 * Empty every collection. Uses deleteMany rather than dropDatabase so the
 * unique and TTL indexes survive - rebuilding them is asynchronous and races
 * with the next test.
 */
export async function resetDb(): Promise<void> {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.disconnect();
}
