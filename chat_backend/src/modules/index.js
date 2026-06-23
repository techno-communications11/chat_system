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

const ensureSchemaCompatibility = async () => {
  const queryInterface = sequelize.getQueryInterface();

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
  await addColumnIfMissing(queryInterface, "chat_groups", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_channels", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_users", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_audit_logs", "metadata", {
    type: DataTypes.JSON,
    allowNull: true,
  });
};

export const syncModels = async () => {
  await sequelize.sync();
  await ensureSchemaCompatibility();
  await seedRoles();
};

export default db;
