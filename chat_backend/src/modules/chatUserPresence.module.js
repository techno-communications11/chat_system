import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatUserPresence = sequelize.define(
  "ChatUserPresence",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sessionId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: "primary",
    },
    presence: {
      type: DataTypes.ENUM("online", "away", "busy", "dnd", "offline"),
      allowNull: false,
      defaultValue: "offline",
    },
    lastSeenAt: { type: DataTypes.DATE, allowNull: true },
    connectedAt: { type: DataTypes.DATE, allowNull: true },
    disconnectedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "chat_user_presence",
    timestamps: true,
    indexes: [{ unique: true, fields: ["userId", "sessionId"] }],
  },
);

export default ChatUserPresence;
