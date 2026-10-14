import { randomUUID } from "node:crypto";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import swaggerUi from "swagger-ui-express";
import env from "./config/env.js";
import openapi from "./docs/openapi.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import sanitize from "./middleware/sanitize.js";
import routes from "./routes/index.js";
import logger from "./utils/logger.js";

export const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (curl, server-to-server, same-origin) are fine.
    if (!origin || env.clientOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
};

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy);

  app.use(
    pinoHttp({
      logger,
      genReqId(req, res) {
        const incoming = req.headers["x-request-id"];
        const id = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url.startsWith("/api/health") },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    })
  );
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());
  app.use(sanitize);

  app.get("/", (_req, res) => res.json({ success: true, name: "ClassConnect API", docs: "/api/docs" }));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "ClassConnect API" }));
  app.get("/api/openapi.json", (_req, res) => res.json(openapi));
  app.use("/api", apiLimiter, routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
