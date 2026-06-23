import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatUserRole = sequelize.define(
  "ChatUserRole",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "chat_user_roles",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "roleId"],
      },
    ],
  },
);

export default ChatUserRole;
