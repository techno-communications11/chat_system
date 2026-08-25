import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatUserRole = sequelize.define(
  "ChatUserRole",
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
    roleId: {
      type: DataTypes.UUID,
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
