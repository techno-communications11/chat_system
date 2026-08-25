import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatMessageReaction = sequelize.define(
  "ChatMessageReaction",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    chatIdentityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    emoji: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "chat_message_reactions",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["messageId", "chatIdentityId", "emoji"],
      },
      { fields: ["chatIdentityId", "messageId"] },
    ],
  },
);

export default ChatMessageReaction;
