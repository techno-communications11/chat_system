import sequelize, { ensureDatabase } from "../src/config/db.js";
import { syncModels } from "../src/modules/index.js";

try {
  await ensureDatabase();
  await sequelize.authenticate();
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  await sequelize.drop({ cascade: true });
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  await syncModels();
  console.log("Development database reset and synchronized with UUID schema.");
} catch (error) {
  console.error("Development database reset failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
  await sequelize.close().catch(() => {});
}
