import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatUser = sequelize.define(
  "ChatUser",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    managerUserId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    marketId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    backoffice: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    marketBackoffice: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordHash: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "disabled"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "chat_users",
    timestamps: true,
  },
);

export default ChatUser;
