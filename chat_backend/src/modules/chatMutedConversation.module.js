import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatMutedConversation = sequelize.define(
  "ChatMutedConversation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    conversationId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "chat_muted_conversations",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["userId", "conversationId"] },
      { fields: ["userId"] },
    ],
  },
);

export default ChatMutedConversation;
