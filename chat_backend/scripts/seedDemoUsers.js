import sequelize, { ensureDatabase } from "../src/config/db.js";
import { syncModels } from "../src/modules/index.js";
import ChatUser from "../src/modules/chatUser.module.js";
import ChatRole from "../src/modules/chatRole.module.js";
import crypto from "crypto";

const demoPassword = "DemoUser123!";
const demoUsers = [
  ["Aarav Sharma", "aarav.sharma"],
  ["Maya Patel", "maya.patel"],
  ["Liam Johnson", "liam.johnson"],
  ["Sophia Williams", "sophia.williams"],
  ["Noah Brown", "noah.brown"],
  ["Olivia Davis", "olivia.davis"],
  ["Ethan Wilson", "ethan.wilson"],
  ["Emma Taylor", "emma.taylor"],
  ["Lucas Anderson", "lucas.anderson"],
  ["Isabella Thomas", "isabella.thomas"],
];

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
};

try {
  await ensureDatabase();
  await sequelize.authenticate();
  await syncModels();
  const role = await ChatRole.findOne({ where: { name: "member" } });
  if (!role) throw new Error("Member role is missing. Run database synchronization first.");

  for (const [displayName, username] of demoUsers) {
    const email = `${username}@demo.pingly.local`;
    const [user, created] = await ChatUser.findOrCreate({
      where: { username },
      defaults: { email, username, displayName, passwordHash: hashPassword(demoPassword), status: "active" },
    });
    if (created) await user.addRole(role);
    console.log(`${created ? "Created" : "Skipped"}: ${email}`);
  }
  console.log(`Demo password for all new users: ${demoPassword}`);
} catch (error) {
  console.error("Demo user seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close().catch(() => {});
}
