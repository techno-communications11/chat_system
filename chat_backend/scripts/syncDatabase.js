import sequelize, { ensureDatabase } from "../src/config/db.js";
import { syncModels } from "../src/modules/index.js";

try {
  await ensureDatabase();
  await sequelize.authenticate();
  await syncModels();
  console.log("Chat database schema synchronized successfully.");
} catch (error) {
  console.error("Chat database schema synchronization failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close().catch(() => {});
}
