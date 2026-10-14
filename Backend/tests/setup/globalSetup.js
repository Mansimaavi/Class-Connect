// Provides a MongoDB connection string to the integration tests.
// CI sets MONGO_URI_TEST to a MongoDB service container; locally we fall back
// to mongodb-memory-server so `npm test` works with nothing installed.

let memoryServer;

export async function setup({ provide }) {
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  provide("mongoUri", uri);
}

export async function teardown() {
  await memoryServer?.stop();
}
