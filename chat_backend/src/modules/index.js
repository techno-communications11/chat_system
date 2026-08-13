import ChatUser from "./chatUser.module.js";
import ChatRole from "./chatRole.module.js";
import ChatUserRole from "./chatUserRole.module.js";
import ChatIdentity from "./chatIdentity.module.js";
import ChatAuditLog from "./chatAuditLog.module.js";
import ChatConversation from "./chatConversation.module.js";
import ChatConversationParticipant from "./chatConversationParticipant.module.js";
import ChatMessage from "./chatMessage.module.js";
import ChatMessageReaction from "./chatMessageReaction.module.js";
import ChatGroup from "./chatGroup.module.js";
import ChatChannel from "./chatChannel.module.js";
import ChatCall from "./chatCall.module.js";
import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";

ChatUser.belongsToMany(ChatRole, {
  through: ChatUserRole,
  foreignKey: "userId",
  otherKey: "roleId",
  as: "roles",
});
ChatRole.belongsToMany(ChatUser, {
  through: ChatUserRole,
  foreignKey: "roleId",
  otherKey: "userId",
  as: "users",
});

ChatConversation.hasMany(ChatConversationParticipant, {
  foreignKey: "conversationId",
  as: "participants",
  onDelete: "CASCADE",
});
ChatConversationParticipant.belongsTo(ChatConversation, {
  foreignKey: "conversationId",
  as: "conversation",
});
ChatIdentity.hasMany(ChatConversationParticipant, {
  foreignKey: "chatIdentityId",
  as: "conversationParticipants",
  onDelete: "CASCADE",
});
ChatConversationParticipant.belongsTo(ChatIdentity, {
  foreignKey: "chatIdentityId",
  as: "identity",
});

ChatConversation.hasMany(ChatMessage, {
  foreignKey: "conversationId",
  as: "messages",
  onDelete: "CASCADE",
});
ChatMessage.belongsTo(ChatConversation, {
  foreignKey: "conversationId",
  as: "conversation",
});
ChatIdentity.hasMany(ChatMessage, {
  foreignKey: "senderIdentityId",
  as: "sentMessages",
});
ChatMessage.belongsTo(ChatIdentity, {
  foreignKey: "senderIdentityId",
  as: "sender",
});

ChatMessage.hasMany(ChatMessageReaction, {
  foreignKey: "messageId",
  as: "reactions",
  onDelete: "CASCADE",
});
ChatMessageReaction.belongsTo(ChatMessage, {
  foreignKey: "messageId",
  as: "message",
});
ChatIdentity.hasMany(ChatMessageReaction, {
  foreignKey: "chatIdentityId",
  as: "messageReactions",
});
ChatMessageReaction.belongsTo(ChatIdentity, {
  foreignKey: "chatIdentityId",
  as: "identity",
});

ChatConversation.hasOne(ChatGroup, {
  foreignKey: "conversationId",
  as: "group",
  onDelete: "CASCADE",
});
ChatGroup.belongsTo(ChatConversation, {
  foreignKey: "conversationId",
  as: "conversation",
});
ChatConversation.hasOne(ChatChannel, {
  foreignKey: "conversationId",
  as: "channel",
  onDelete: "CASCADE",
});
ChatChannel.belongsTo(ChatConversation, {
  foreignKey: "conversationId",
  as: "conversation",
});
ChatConversation.hasMany(ChatCall, {
  foreignKey: "conversationId",
  as: "calls",
  onDelete: "CASCADE",
});
ChatCall.belongsTo(ChatConversation, {
  foreignKey: "conversationId",
  as: "conversation",
});

const db = {
  sequelize,
  chatUsers: ChatUser,
  chatRoles: ChatRole,
  chatUserRoles: ChatUserRole,
  chatIdentities: ChatIdentity,
  chatAuditLogs: ChatAuditLog,
  chatConversations: ChatConversation,
  chatConversationParticipants: ChatConversationParticipant,
  chatMessages: ChatMessage,
  chatMessageReactions: ChatMessageReaction,
  chatGroups: ChatGroup,
  chatChannels: ChatChannel,
  chatCalls: ChatCall,
};

const seedRoles = async () => {
  const roles = [
    {
      name: "member",
      description: "Standard chat user",
      permissions: ["chat:read", "chat:write"],
    },
    {
      name: "admin",
      description: "Chat administrator",
      permissions: ["chat:read", "chat:write", "chat:manage"],
    },
    {
      name: "superadmin",
      description: "Full chat administrator",
      permissions: ["chat:*"],
    },
  ];

  for (const role of roles) {
    await ChatRole.findOrCreate({
      where: { name: role.name },
      defaults: role,
    });
  }
};

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  const table = await queryInterface.describeTable(tableName);

  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

const changeColumnIfPresent = async (queryInterface, tableName, columnName, definition) => {
  const table = await queryInterface.describeTable(tableName);

  if (table[columnName]) {
    await queryInterface.changeColumn(tableName, columnName, definition);
  }
};

const removeColumnIfPresent = async (queryInterface, tableName, columnName) => {
  const table = await queryInterface.describeTable(tableName);
  if (table[columnName]) await queryInterface.removeColumn(tableName, columnName);
};

const addIndexIfMissing = async (queryInterface, tableName, fields, name) => {
  const indexes = await queryInterface.showIndex(tableName);
  if (!indexes.some((index) => index.name === name)) {
    await queryInterface.addIndex(tableName, fields, { name });
  }
};

const ensureSchemaCompatibility = async () => {
  const queryInterface = sequelize.getQueryInterface();

  await addIndexIfMissing(queryInterface, "chat_identities", ["appName", "provider", "providerUserId"], "chat_identities_app_provider_user");
  await addIndexIfMissing(queryInterface, "chat_conversations", ["appName", "lastMessageAt"], "chat_conversations_app_last_message");
  await addIndexIfMissing(queryInterface, "chat_conversations", ["appName", "type"], "chat_conversations_app_type");
  await addIndexIfMissing(queryInterface, "chat_conversation_participants", ["chatIdentityId", "conversationId"], "chat_participants_identity_conversation");
  await addIndexIfMissing(queryInterface, "chat_messages", ["conversationId", "createdAt"], "chat_messages_conversation_created");
  await addIndexIfMissing(queryInterface, "chat_messages", ["senderIdentityId", "createdAt"], "chat_messages_sender_created");
  await addIndexIfMissing(queryInterface, "chat_message_reactions", ["chatIdentityId", "messageId"], "chat_reactions_identity_message");
  await addIndexIfMissing(queryInterface, "chat_audit_logs", ["appName", "createdAt"], "chat_audit_app_created");
  await addIndexIfMissing(queryInterface, "chat_audit_logs", ["appName", "action", "createdAt"], "chat_audit_app_action_created");

  await addColumnIfMissing(queryInterface, "chat_conversations", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_identities", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_conversations", "lastMessageAt", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_messages", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_messages", "deletedAt", { type: DataTypes.DATE, allowNull: true });
  await addColumnIfMissing(queryInterface, "chat_messages", "deletedByIdentityId", { type: DataTypes.INTEGER, allowNull: true });
  await addColumnIfMissing(queryInterface, "chat_conversation_participants", "lastReadAt", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_conversation_participants", "clearedAt", {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_groups", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_channels", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
  await changeColumnIfPresent(queryInterface, "chat_groups", "ownerUserId", {
    type: DataTypes.STRING,
    allowNull: false,
  });
  await changeColumnIfPresent(queryInterface, "chat_channels", "ownerUserId", {
    type: DataTypes.STRING,
    allowNull: false,
  });
  await addColumnIfMissing(queryInterface, "chat_users", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
  await changeColumnIfPresent(queryInterface, "chat_users", "avatarUrl", {
    type: DataTypes.TEXT,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_audit_logs", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
  await removeColumnIfPresent(queryInterface, "chat_calls", "providerSpaceName");
  await removeColumnIfPresent(queryInterface, "chat_calls", "meetingUri");
  await removeColumnIfPresent(queryInterface, "chat_calls", "meetingCode");
  // Expand first so legacy `started` rows can be mapped without MySQL enum
  // truncation, then remove the legacy value in the final definition.
  await changeColumnIfPresent(queryInterface, "chat_calls", "status", {
    type: DataTypes.ENUM("started", "ringing", "connecting", "accepted", "declined", "cancelled", "ended", "failed", "missed"),
    allowNull: false,
    defaultValue: "ringing",
  });
  await sequelize.query(
    "UPDATE `chat_calls` SET `status` = 'accepted' WHERE `status` = 'started'",
  );
  await changeColumnIfPresent(queryInterface, "chat_calls", "status", {
    type: DataTypes.ENUM("ringing", "connecting", "accepted", "declined", "cancelled", "ended", "failed", "missed"),
    allowNull: false,
    defaultValue: "ringing",
  });
};

export const syncModels = async () => {
  await sequelize.sync();
  await ensureSchemaCompatibility();
  await seedRoles();
};

export default db;
