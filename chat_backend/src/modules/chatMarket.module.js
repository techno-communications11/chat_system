import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatMarket = sequelize.define(
  "ChatMarket",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  { tableName: "chat_markets", timestamps: true },
);

export default ChatMarket;
