import sequelize from "../src/config/db.js";
import "../src/modules/index.js";
import ChatIdentity from "../src/modules/chatIdentity.module.js";
import ChatUser from "../src/modules/chatUser.module.js";
import ChatConversationParticipant from "../src/modules/chatConversationParticipant.module.js";
import ChatMessage from "../src/modules/chatMessage.module.js";
import ChatMessageReaction from "../src/modules/chatMessageReaction.module.js";

const latestDate = (first, second) => {
  if (!first) return second || null;
  if (!second) return first;
  return new Date(first).getTime() >= new Date(second).getTime() ? first : second;
};

try {
  const transaction = await sequelize.transaction();
  try {
    const identities = await ChatIdentity.findAll({
      where: { appName: "local", provider: "local_chat" },
      transaction,
    });
    let merged = 0;

    for (const identity of identities) {
      const email = String(identity.appUserEmail || "").trim().toLowerCase();
      if (!email) continue;
      const user = await ChatUser.findOne({ where: { email }, transaction });
      if (!user || String(user.id) === String(identity.appUserId)) continue;

      const canonical = await ChatIdentity.findOne({
        where: {
          appName: identity.appName,
          provider: identity.provider,
          appUserId: String(user.id),
        },
        transaction,
      });

      if (!canonical) {
        await identity.update(
          { appUserId: String(user.id), providerUserId: String(user.id) },
          { transaction },
        );
        continue;
      }

      const memberships = await ChatConversationParticipant.findAll({
        where: { chatIdentityId: identity.id },
        transaction,
      });
      for (const membership of memberships) {
        const duplicate = await ChatConversationParticipant.findOne({
          where: {
            conversationId: membership.conversationId,
            chatIdentityId: canonical.id,
          },
          transaction,
        });
        if (duplicate) {
          await duplicate.update(
            {
              role: membership.role === "owner" ? "owner" : duplicate.role,
              lastReadAt: latestDate(duplicate.lastReadAt, membership.lastReadAt),
              clearedAt: latestDate(duplicate.clearedAt, membership.clearedAt),
            },
            { transaction },
          );
          await membership.destroy({ transaction });
        } else {
          await membership.update({ chatIdentityId: canonical.id }, { transaction });
        }
      }

      await ChatMessage.update(
        { senderIdentityId: canonical.id },
        { where: { senderIdentityId: identity.id }, transaction },
      );
      await ChatMessageReaction.update(
        { chatIdentityId: canonical.id },
        { where: { chatIdentityId: identity.id }, transaction },
      );
      await identity.destroy({ transaction });
      merged += 1;
    }

    await transaction.commit();
    console.log(`Normalized local UUID identities; merged ${merged} duplicate identities.`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
} catch (error) {
  console.error("Identity normalization failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close().catch(() => {});
}
