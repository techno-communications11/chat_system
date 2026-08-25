import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatCall = sequelize.define(
  "ChatCall",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    appName: { type: DataTypes.STRING, allowNull: false },
    conversationId: { type: DataTypes.UUID, allowNull: false },
    callId: { type: DataTypes.STRING(64), allowNull: false },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "internal_webrtc",
    },
    type: { type: DataTypes.ENUM("audio", "video"), allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "ringing",
        "connecting",
        "accepted",
        "declined",
        "cancelled",
        "ended",
        "failed",
        "missed",
      ),
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
