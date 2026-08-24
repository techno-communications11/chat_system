import assert from "node:assert/strict";
import test from "node:test";
import db from "../src/modules/index.js";

const indexFields = (model) =>
  model._indexes.flatMap((index) => [
    ...(index.unique ? [index.fields.join(",")] : []),
    index.fields.join(","),
  ]);

test("database models define tenant-safe identity and membership constraints", () => {
  assert.ok(db.chatConversationParticipants.rawAttributes.clearedAt);
  assert.ok(
    indexFields(db.chatIdentities).includes("appName,appUserId,provider"),
  );
  assert.ok(
    indexFields(db.chatConversationParticipants).includes(
      "conversationId,chatIdentityId",
    ),
  );
  assert.ok(
    indexFields(db.chatConversationParticipants).includes(
      "chatIdentityId,conversationId",
    ),
  );
  assert.ok(db.chatConversations.associations.participants);
  assert.ok(db.chatConversationParticipants.associations.identity);
});

test("database models support message pagination and audit queries", () => {
  assert.ok(indexFields(db.chatMessages).includes("conversationId,createdAt"));
  assert.ok(
    indexFields(db.chatMessages).includes("senderIdentityId,createdAt"),
  );
  assert.ok(indexFields(db.chatAuditLogs).includes("appName,createdAt"));
  assert.ok(indexFields(db.chatAuditLogs).includes("appName,action,createdAt"));
  assert.ok(db.chatMessages.associations.sender);
  assert.ok(db.chatMessages.associations.reactions);
});

test("database models define cascade-capable conversation relationships", () => {
  assert.equal(
    db.chatConversations.associations.participants.options.onDelete,
    "CASCADE",
  );
  assert.equal(
    db.chatConversations.associations.messages.options.onDelete,
    "CASCADE",
  );
  assert.equal(
    db.chatConversations.associations.group.options.onDelete,
    "CASCADE",
  );
  assert.equal(
    db.chatConversations.associations.channel.options.onDelete,
    "CASCADE",
  );
  assert.equal(
    db.chatConversations.associations.calls.options.onDelete,
    "CASCADE",
  );
});
