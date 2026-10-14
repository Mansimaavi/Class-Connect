/**
 * Creates the first super admin, or promotes an existing account.
 *
 *   npm run seed:admin -- --email you@example.com
 *     promotes an existing account
 *
 *   SUPERADMIN_PASSWORD='S3cure-pass' npm run seed:admin -- --email you@example.com --name "Your Name" --username you
 *     creates a new super admin account
 */
import { parseArgs } from "node:util";
import { ROLES } from "../config/permissions.js";
import { connectDB, disconnectDB } from "../config/database.js";
import User from "../models/user.js";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    username: { type: "string" },
  },
});

const run = async () => {
  const email = values.email?.trim().toLowerCase();
  if (!email) throw new Error("Pass --email <address>");

  await connectDB();
  const existing = await User.findOne({ email });

  if (existing) {
    existing.role = ROLES.SUPERADMIN;
    existing.createdBySuperAdmin = true;
    await existing.save();
    console.log(`Promoted ${existing.username} <${email}> to superadmin.`);
    return;
  }

  const password = process.env.SUPERADMIN_PASSWORD;
  if (!password || !values.name || !values.username) {
    throw new Error("No account with that email. To create one, pass --name and --username and set SUPERADMIN_PASSWORD.");
  }

  const user = await User.create({
    name: values.name,
    username: values.username,
    email,
    password,
    course: "Administration",
    college: "ClassConnect",
    role: ROLES.SUPERADMIN,
    createdBySuperAdmin: true,
  });
  console.log(`Created superadmin ${user.username} <${email}>.`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
