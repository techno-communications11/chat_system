import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatAuditLog = sequelize.define(
  "ChatAuditLog",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    appName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "chat_system",
    },
    appUserId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "local_chat",
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    targetUserId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    targetChatId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "success",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "chat_audit_logs",
    timestamps: true,
    indexes: [
      { fields: ["appName", "createdAt"] },
      { fields: ["appName", "action", "createdAt"] },
    ],
  },
);

export default ChatAuditLog;
