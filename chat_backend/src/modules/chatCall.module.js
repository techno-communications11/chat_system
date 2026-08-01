import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatCall = sequelize.define(
  "ChatCall",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    appName: { type: DataTypes.STRING, allowNull: false },
    conversationId: { type: DataTypes.INTEGER, allowNull: false },
    callId: { type: DataTypes.STRING(64), allowNull: false },
    provider: { type: DataTypes.STRING, allowNull: false, defaultValue: "internal_webrtc" },
    providerSpaceName: { type: DataTypes.STRING, allowNull: true },
    meetingUri: { type: DataTypes.TEXT, allowNull: true },
    meetingCode: { type: DataTypes.STRING, allowNull: true },
    type: { type: DataTypes.ENUM("audio", "video"), allowNull: false },
    status: {
      type: DataTypes.ENUM("ringing", "connecting", "accepted", "declined", "cancelled", "ended", "failed", "missed"),
      allowNull: false,
      defaultValue: "ringing",
    },
    startedByUserId: { type: DataTypes.STRING, allowNull: false },
    startedAt: { type: DataTypes.DATE, allowNull: false },
    endedAt: { type: DataTypes.DATE, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "chat_calls",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["appName", "callId"] },
      { fields: ["appName", "conversationId", "status"] },
    ],
  },
);

export default ChatCall;
