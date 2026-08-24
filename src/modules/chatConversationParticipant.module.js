import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatConversationParticipant = sequelize.define(
  "ChatConversationParticipant",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    chatIdentityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "member",
    },
    lastReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    clearedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "chat_conversation_participants",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["conversationId", "chatIdentityId"],
      },
      { fields: ["chatIdentityId", "conversationId"] },
    ],
  },
);

export default ChatConversationParticipant;
