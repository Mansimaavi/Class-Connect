import http from "node:http";
import createApp from "./app.js";
import { connectDB, disconnectDB } from "./config/database.js";
import env from "./config/env.js";
import initSocket from "./socket/index.js";
import { flushAllWhiteboards } from "./socket/handlers/whiteboardHandlers.js";
import logger from "./utils/logger.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

const start = async () => {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  const io = initSocket(server);

  server.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, "ClassConnect API listening");
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    const force = setTimeout(() => {
      logger.error("graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    force.unref();

    try {
      await new Promise((resolve) => io.close(() => resolve()));
      await new Promise((resolve) => server.close(() => resolve()));
      await flushAllWhiteboards();
      await disconnectDB();
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, "error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});

start().catch((error) => {
  logger.fatal({ err: error }, "failed to start server");
  process.exit(1);
});
