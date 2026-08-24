import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { getBearerToken, verifyChatToken } from "../src/auth/chatAuth.js";

const secret = "a-test-secret-long-enough-for-chat-auth";

const configure = () => {
  process.env.SERVER_SECRETS = secret;
  process.env.CHAT_REQUIRE_JTI = "true";
  process.env.CHAT_AUTH_ISSUERS = JSON.stringify({
    "https://identity.example.test": {
      audience: "chat-api",
      algorithms: ["HS256"],
      secret,
      apps: ["ticket_portal", "crm"],
    },
  });
};

const token = (overrides = {}, options = {}) =>
  jwt.sign(
    {
      tenant_id: "company-a",
      name: "Ada",
      jti: "assertion-1",
      ...overrides,
    },
    secret,
    {
      algorithm: "HS256",
      subject: "user-42",
      issuer: "https://identity.example.test",
      audience: "chat-api",
      expiresIn: "5m",
      ...options,
    },
  );

test("extracts only a well-formed Bearer token", () => {
  assert.equal(getBearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(getBearerToken("Basic abc"), null);
  assert.equal(getBearerToken("Bearer one two"), null);
});

test("validates issuer, audience, tenant, subject, jti, and host app", () => {
  configure();
  const auth = verifyChatToken(token(), { requestedApp: "ticket_portal" });
  assert.equal(auth.subject, "user-42");
  assert.equal(auth.tenantId, "company-a");
  assert.equal(auth.sourceApp, "ticket_portal");
});

test("uses the signed app claim when no host app header is provided", () => {
  configure();
  const auth = verifyChatToken(token({ app: "crm" }));
  assert.equal(auth.sourceApp, "crm");
});

test("rejects a host application outside the signed/configured allowlist", () => {
  configure();
  assert.throws(() => verifyChatToken(token(), { requestedApp: "inventory" }), {
    code: "CHAT_AUTH_APP_FORBIDDEN",
  });
});

test("rejects tokens without tenant or jti claims", () => {
  configure();
  assert.throws(() => verifyChatToken(token({ tenant_id: undefined })), {
    code: "CHAT_AUTH_TENANT_MISSING",
  });
  assert.throws(() => verifyChatToken(token({ jti: undefined })), {
    code: "CHAT_AUTH_JTI_MISSING",
  });
});

test("rejects the wrong audience", () => {
  configure();
  assert.throws(() => verifyChatToken(token({}, { audience: "another-api" })));
});

test("rejects tenant identifiers instead of lossy normalization", () => {
  configure();
  assert.throws(
    () =>
      verifyChatToken(token({ tenant_id: "company a" }), {
        requestedApp: "ticket_portal",
      }),
    { code: "CHAT_AUTH_TENANT_INVALID" },
  );
});
