import pino from "pino";
import env from "../config/env.js";

const usePrettyLogs = !env.isProduction && !env.isTest;

const logger = pino({
  level: env.logLevel,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.token",
    ],
    censor: "[redacted]",
  },
  ...(usePrettyLogs && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
    },
  }),
});

export default logger;
