import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatUserSettings = sequelize.define(
  "ChatUserSettings",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    themeMode: {
      type: DataTypes.ENUM("light", "dark"),
      allowNull: false,
      defaultValue: "light",
    },
    desktopNotifications: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    enterToSend: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "chat_user_settings",
    timestamps: true,
  },
);

export default ChatUserSettings;
