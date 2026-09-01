import ChatUser from "./chatUser.module.js";
import ChatUserSettings from "./chatUserSettings.module.js";
import ChatBlockedUser from "./chatBlockedUser.module.js";
import ChatMutedConversation from "./chatMutedConversation.module.js";
import ChatMarket from "./chatMarket.module.js";
import ChatUserPresence from "./chatUserPresence.module.js";
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
ChatUser.hasOne(ChatUserSettings, {
  foreignKey: "userId",
  as: "settings",
  onDelete: "CASCADE",
});
ChatUser.belongsTo(ChatUser, { foreignKey: "managerUserId", as: "manager" });
ChatUser.hasMany(ChatUser, { foreignKey: "managerUserId", as: "reports" });
ChatUser.belongsTo(ChatMarket, { foreignKey: "marketId", as: "marketRelation" });
ChatMarket.hasMany(ChatUser, { foreignKey: "marketId", as: "users" });
ChatUser.hasMany(ChatUserPresence, {
  foreignKey: "userId",
  as: "presenceSessions",
  onDelete: "CASCADE",
});
ChatUserPresence.belongsTo(ChatUser, { foreignKey: "userId", as: "user" });
ChatUserSettings.belongsTo(ChatUser, {
  foreignKey: "userId",
  as: "user",
});
ChatUser.hasMany(ChatBlockedUser, {
  foreignKey: "userId",
  as: "blockedUsers",
  onDelete: "CASCADE",
});
ChatBlockedUser.belongsTo(ChatUser, {
  foreignKey: "userId",
  as: "user",
});
ChatUser.hasMany(ChatMutedConversation, {
  foreignKey: "userId",
  as: "mutedConversations",
  onDelete: "CASCADE",
});
ChatMutedConversation.belongsTo(ChatUser, {
  foreignKey: "userId",
  as: "user",
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
  chatUserSettings: ChatUserSettings,
  chatBlockedUsers: ChatBlockedUser,
  chatMutedConversations: ChatMutedConversation,
  chatMarkets: ChatMarket,
  chatUserPresence: ChatUserPresence,
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

const addForeignKeyIfMissing = async (tableName, columnName, referenceTable, referenceColumn, name, onDelete = "SET NULL") => {
  const [rows] = await sequelize.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName
       AND COLUMN_NAME = :columnName AND REFERENCED_TABLE_NAME = :referenceTable`,
    { replacements: { tableName, columnName, referenceTable } },
  );
  if (!rows.length) {
    await sequelize.getQueryInterface().addConstraint(tableName, {
      fields: [columnName],
      type: "foreign key",
      name,
      references: { table: referenceTable, field: referenceColumn },
      onUpdate: "CASCADE",
      onDelete,
    });
  }
};

const repairMessageRelationIndexes = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const indexes = await queryInterface.showIndex("chat_message_reactions");
  const expected = [
    {
      name: "chat_message_reactions_message_id_chat_identity_id_emoji",
      fields: ["messageId", "chatIdentityId", "emoji"],
      unique: true,
    },
    {
      name: "chat_message_reactions_chat_identity_id_message_id",
      fields: ["chatIdentityId", "messageId"],
    },
    {
      name: "chat_reactions_identity_message",
      fields: ["chatIdentityId", "messageId"],
    },
  ];
  for (const definition of expected) {
    const existing = indexes.find((index) => index.name === definition.name);
    const existingFields = existing?.fields?.map((field) => field.attribute || field.name) || [];
    if (existing && existingFields.join(",") !== definition.fields.join(",")) {
      await queryInterface.removeIndex("chat_message_reactions", definition.name);
    }
    const refreshed = await queryInterface.showIndex("chat_message_reactions");
    if (!refreshed.some((index) => index.name === definition.name)) {
      await queryInterface.addIndex("chat_message_reactions", definition.fields, {
        name: definition.name,
        unique: definition.unique || false,
      });
    }
  }
  await addForeignKeyIfMissing(
    "chat_message_reactions",
    "messageId",
    "chat_messages",
    "id",
    "chat_message_reactions_message_fk",
    "CASCADE",
  );
};

const migrateMessageIdsToUuid = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  if (!tables.some((table) => String(table).toLowerCase() === "chat_messages")) return;

  const messageColumns = await queryInterface.describeTable("chat_messages");
  if (String(messageColumns.id?.type || "").toLowerCase().includes("char")) return;

  try {
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    await sequelize.query("ALTER TABLE `chat_messages` ADD COLUMN `uuidId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL");
    await sequelize.query("UPDATE `chat_messages` SET `uuidId` = UUID() WHERE `uuidId` IS NULL");
    await sequelize.query("ALTER TABLE `chat_messages` MODIFY COLUMN `uuidId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL");

    const reactionColumns = await queryInterface.describeTable("chat_message_reactions");
    if (reactionColumns.messageId) {
      await sequelize.query("ALTER TABLE `chat_message_reactions` DROP FOREIGN KEY `chat_message_reactions_ibfk_1`").catch(() => {});
      await sequelize.query("ALTER TABLE `chat_message_reactions` ADD COLUMN `uuidMessageId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL");
      await sequelize.query("UPDATE `chat_message_reactions` r JOIN `chat_messages` m ON r.`messageId` = m.`id` SET r.`uuidMessageId` = m.`uuidId`");
      await sequelize.query("ALTER TABLE `chat_message_reactions` MODIFY COLUMN `uuidMessageId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL");
      await sequelize.query("ALTER TABLE `chat_message_reactions` DROP COLUMN `messageId`, CHANGE COLUMN `uuidMessageId` `messageId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL");
    }

    await sequelize.query("ALTER TABLE `chat_messages` ADD COLUMN `uuidReplyToMessageId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL");
    await sequelize.query("UPDATE `chat_messages` r JOIN `chat_messages` m ON r.`replyToMessageId` = m.`id` SET r.`uuidReplyToMessageId` = m.`uuidId`");
    await sequelize.query("ALTER TABLE `chat_messages` DROP COLUMN `replyToMessageId`, CHANGE COLUMN `uuidReplyToMessageId` `replyToMessageId` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL");
    await sequelize.query("ALTER TABLE `chat_messages` DROP PRIMARY KEY, CHANGE COLUMN `id` `legacyId` INT NOT NULL, CHANGE COLUMN `uuidId` `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, ADD PRIMARY KEY (`id`)");
    await sequelize.query("ALTER TABLE `chat_messages` DROP COLUMN `legacyId`");
    await addForeignKeyIfMissing("chat_message_reactions", "messageId", "chat_messages", "id", "chat_message_reactions_message_fk", "CASCADE");
  } finally {
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
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
  await addColumnIfMissing(queryInterface, "chat_conversations", "publicId", {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_groups", "publicId", {
    type: DataTypes.UUID,
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
  await addColumnIfMissing(queryInterface, "chat_messages", "deletedByIdentityId", { type: DataTypes.UUID, allowNull: true });
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
  await addColumnIfMissing(queryInterface, "chat_users", "designation", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_users", "managerUserId", {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_users", "marketId", {
    type: DataTypes.UUID,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_users", "backoffice", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await addColumnIfMissing(queryInterface, "chat_users", "marketBackoffice", {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await addIndexIfMissing(queryInterface, "chat_users", ["managerUserId"], "chat_users_manager_user");
  await addIndexIfMissing(queryInterface, "chat_users", ["marketId"], "chat_users_market");
  await addForeignKeyIfMissing("chat_users", "managerUserId", "chat_users", "id", "chat_users_manager_fk");
  await addForeignKeyIfMissing("chat_users", "marketId", "chat_markets", "id", "chat_users_market_fk");

  // Backfill normalized profile relations from the old display fields before
  // removing those legacy columns.
  const userColumns = await queryInterface.describeTable("chat_users");
  const legacyProfileColumnsExist = userColumns.managerName || userColumns.market;
  const [legacyUsers] = legacyProfileColumnsExist
    ? await sequelize.query("SELECT id, displayName, username, email, managerName, managerUserId, market, marketId FROM chat_users")
    : [[]];
  const usersWithProfileRelations = legacyUsers;
  const usersByName = new Map();
  for (const candidate of usersWithProfileRelations) {
    for (const value of [candidate.displayName, candidate.username, candidate.email]) {
      if (value) usersByName.set(String(value).trim().toLowerCase(), candidate);
    }
  }
  for (const user of usersWithProfileRelations) {
    const updates = {};
    if (!user.managerUserId && user.managerName) {
      const manager = usersByName.get(String(user.managerName).trim().toLowerCase());
      if (manager && manager.id !== user.id) updates.managerUserId = manager.id;
    }
    if (!user.marketId && user.market) {
      const [market] = await ChatMarket.findOrCreate({
        where: { name: String(user.market).trim() },
        defaults: { name: String(user.market).trim() },
      });
      updates.marketId = market.id;
    }
    if (Object.keys(updates).length) await ChatUser.update(updates, { where: { id: user.id } });
  }

  const [legacyPresenceUsers] = userColumns.presence || userColumns.lastSeenAt
    ? await sequelize.query("SELECT id, presence, lastSeenAt FROM chat_users")
    : [[]];
  const usersWithPresence = legacyPresenceUsers.length
    ? legacyPresenceUsers
    : await ChatUser.findAll({ attributes: ["id"] });
  for (const user of usersWithPresence) {
    await ChatUserPresence.findOrCreate({
      where: { userId: user.id, sessionId: "primary" },
      defaults: {
        userId: user.id,
        sessionId: "primary",
        presence: user.presence || "offline",
        lastSeenAt: user.lastSeenAt || null,
        connectedAt: user.presence === "online" ? user.lastSeenAt : null,
        disconnectedAt: user.presence === "online" ? null : user.lastSeenAt,
      },
    });
  }
  await removeColumnIfPresent(queryInterface, "chat_users", "managerName");
  await removeColumnIfPresent(queryInterface, "chat_users", "market");
  await removeColumnIfPresent(queryInterface, "chat_users", "presence");
  await removeColumnIfPresent(queryInterface, "chat_users", "lastSeenAt");
  await removeColumnIfPresent(queryInterface, "chat_users", "metadata");
  const settingsTable = await queryInterface.describeTable("chat_user_settings");
  if (settingsTable.id && !String(settingsTable.id.type).toLowerCase().includes("char")) {
    const settingsRowCount = await ChatUserSettings.count();
    if (settingsRowCount === 0) {
      await sequelize.query(
        "ALTER TABLE `chat_user_settings` MODIFY COLUMN `id` CHAR(36) NOT NULL",
      );
    }
  }
  const settingsColumns = await queryInterface.describeTable("chat_user_settings");
  if (settingsColumns.mutedChatIds || settingsColumns.blockedUserIds) {
    const [legacyRows] = await sequelize.query(
      "SELECT `userId`, `mutedChatIds`, `blockedUserIds` FROM `chat_user_settings`",
    );
    for (const row of legacyRows) {
      const parseIds = (value) => {
        if (Array.isArray(value)) return value;
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };
      const mutedChatIds = [...new Set(parseIds(row.mutedChatIds).map(String).filter(Boolean))];
      const blockedUserIds = [...new Set(parseIds(row.blockedUserIds).map(String).filter(Boolean))];
      if (mutedChatIds.length > 0) {
        await ChatMutedConversation.bulkCreate(
          mutedChatIds.map((conversationId) => ({ userId: row.userId, conversationId })),
          { ignoreDuplicates: true },
        );
      }
      if (blockedUserIds.length > 0) {
        await ChatBlockedUser.bulkCreate(
          blockedUserIds.map((blockedUserId) => ({ userId: row.userId, blockedUserId })),
          { ignoreDuplicates: true },
        );
      }
    }
  }
  await removeColumnIfPresent(queryInterface, "chat_user_settings", "mutedChatIds");
  await removeColumnIfPresent(queryInterface, "chat_user_settings", "blockedUserIds");
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
  await migrateMessageIdsToUuid();
  await sequelize.sync();
  await ensureSchemaCompatibility();
  await repairMessageRelationIndexes();
  await seedRoles();
};

export default db;
