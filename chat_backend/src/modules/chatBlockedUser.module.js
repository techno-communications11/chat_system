import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatBlockedUser = sequelize.define(
  "ChatBlockedUser",
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
    blockedUserId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "chat_blocked_users",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["userId", "blockedUserId"] },
      { fields: ["userId"] },
    ],
  },
);

export default ChatBlockedUser;
