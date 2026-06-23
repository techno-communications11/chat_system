import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ChatIdentity = sequelize.define(
  "ChatIdentity",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    appName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "chat_system",
    },
    appUserId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    appUserEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "local_chat",
    },
    providerUserId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    providerEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    providerDisplayName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "chat_identities",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["appName", "appUserId", "provider"],
      },
    ],
  }
);

export default ChatIdentity;

