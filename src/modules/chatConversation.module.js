import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatConversation = sequelize.define(
  "ChatConversation",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    publicId: {
      type: DataTypes.UUID,
      allowNull: true,
      unique: true,
    },
    appName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "chat_system",
    },
    type: {
      type: DataTypes.ENUM("direct", "group"),
      allowNull: false,
      defaultValue: "direct",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    directKey: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "chat_conversations",
    timestamps: true,
    indexes: [
      { fields: ["appName", "lastMessageAt"] },
      { fields: ["appName", "type"] },
    ],
  },
);

export default ChatConversation;
