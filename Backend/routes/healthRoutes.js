import express from "express";
import { createRequire } from "node:module";
import env from "../config/env.js";
import { isDatabaseReady } from "../config/database.js";

const { version } = createRequire(import.meta.url)("../package.json");
const router = express.Router();

/** Liveness: the process is up. Used by Docker/ECS health checks. */
router.get("/", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    version,
    environment: env.nodeEnv,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/** Readiness: the app can serve traffic (database connected). Used by the deploy smoke test. */
router.get("/ready", (_req, res) => {
  const ready = isDatabaseReady();
  res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? "ready" : "unavailable",
    database: ready ? "connected" : "disconnected",
  });
});

export default router;
