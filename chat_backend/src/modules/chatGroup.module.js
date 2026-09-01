import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatGroup = sequelize.define(
  "ChatGroup",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    publicId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true,
    },
    appName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "chat_system",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ownerUserId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "chat_groups",
    timestamps: true,
    indexes: [{ fields: ["appName", "updatedAt"] }],
  },
);

export default ChatGroup;
