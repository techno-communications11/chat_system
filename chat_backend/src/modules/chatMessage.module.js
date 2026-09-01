import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatMessage = sequelize.define(
  "ChatMessage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    senderIdentityId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    replyToMessageId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
    deletedByIdentityId: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "chat_messages",
    timestamps: true,
    indexes: [
      { fields: ["conversationId", "createdAt"] },
      { fields: ["conversationId", "senderIdentityId", "createdAt"] },
      { fields: ["senderIdentityId", "createdAt"] },
    ],
  },
);

export default ChatMessage;
