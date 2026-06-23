import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatRole = sequelize.define(
  "ChatRole",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "chat_roles",
    timestamps: true,
  },
);

export default ChatRole;
