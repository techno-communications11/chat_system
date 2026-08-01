import mysql from "mysql2/promise";
import Sequelize from "sequelize";
import moment from "moment-timezone";
import loadEnv from "./loadEnv.js";

loadEnv();

const dbName = process.env.DB_NAME || "chat_system";
const dbUser = process.env.DB_USER || "root";
const dbPass = process.env.DB_PASS || "root";
const dbHost = process.env.DB_HOST || "localhost";
const dbPort = Number(process.env.DB_PORT || 3306);
const currentTimezone = moment.tz("America/Chicago").format("Z");

export const ensureDatabase = async () => {
  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPass,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.end();
};

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: "mysql",
  logging: false,
  timezone: currentTimezone,
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
  },
});

export default sequelize;
