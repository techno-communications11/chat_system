import jwt from "jsonwebtoken";
import serverConfig from "../config/server.config.js";
import { normalizeAppName } from "../Servicess/applicationDirectory.services.js";

const csv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseIssuerRegistry = () => {
  if (process.env.CHAT_AUTH_ISSUERS) {
    try {
      const registry = JSON.parse(process.env.CHAT_AUTH_ISSUERS);
      if (registry && typeof registry === "object") return registry;
    } catch (error) {
      throw new Error(`CHAT_AUTH_ISSUERS is not valid JSON: ${error.message}`);
    }
  }

  const issuer = process.env.CHAT_JWT_ISSUER || "chat-local";
  return {
    [issuer]: {
      audience: process.env.CHAT_JWT_AUDIENCE || "chat-api",
      algorithms: csv(process.env.CHAT_JWT_ALGORITHMS || "HS256"),
      secret: serverConfig.secretKey,
      apps: csv(process.env.CHAT_ALLOWED_APPS),
    },
  };
};

const getClaim = (payload, names) =>
  names.map((name) => payload?.[name]).find(Boolean);

export const validateTenantId = (value) => {
  const tenantId = String(value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(tenantId)) {
    throw Object.assign(new Error("tenant_id has an invalid format"), {
      code: "CHAT_AUTH_TENANT_INVALID",
    });
  }
  return tenantId;
};

export const getBearerToken = (header) => {
  const match = /^Bearer\s+([^\s]+)$/i.exec(String(header || "").trim());
  return match?.[1] || null;
};

export const verifyChatToken = (token, { requestedApp } = {}) => {
  const decoded = jwt.decode(token, { complete: true });
  const issuer = decoded?.payload?.iss;
  const registry = parseIssuerRegistry();
  const issuerConfig = issuer && registry[issuer];

  if (!issuerConfig) {
    const error = new Error("Token issuer is not trusted");
    error.code = "CHAT_AUTH_ISSUER_INVALID";
    throw error;
  }

  const algorithms =
    Array.isArray(issuerConfig.algorithms) && issuerConfig.algorithms.length
      ? issuerConfig.algorithms
      : ["RS256"];
  const verificationKey = issuerConfig.publicKey || issuerConfig.secret;
  if (!verificationKey)
    throw new Error(`No verification key configured for issuer ${issuer}`);

  const key =
    typeof verificationKey === "string"
      ? verificationKey.replace(/\\n/g, "\n")
      : verificationKey;
  const payload = jwt.verify(token, key, {
    algorithms,
    issuer,
    audience: issuerConfig.audience,
    clockTolerance: Number.isFinite(
      Number(process.env.CHAT_JWT_CLOCK_TOLERANCE_SECONDS),
    )
      ? Number(process.env.CHAT_JWT_CLOCK_TOLERANCE_SECONDS)
      : 5,
  });

  const subject = getClaim(payload, [
    "sub",
    "userId",
    "user_id",
    "appUserId",
    "id",
  ]);
  const tenantId = getClaim(payload, [
    "tenant_id",
    "tenantId",
    "organization_id",
    "org_id",
  ]);
  if (!subject)
    throw Object.assign(new Error("Token subject is required"), {
      code: "CHAT_AUTH_SUBJECT_MISSING",
    });
  if (!tenantId)
    throw Object.assign(new Error("Signed tenant_id claim is required"), {
      code: "CHAT_AUTH_TENANT_MISSING",
    });
  if (process.env.CHAT_REQUIRE_JTI !== "false" && !payload.jti) {
    throw Object.assign(new Error("Token jti claim is required"), {
      code: "CHAT_AUTH_JTI_MISSING",
    });
  }

  const sourceApp = normalizeAppName(
    requestedApp || payload.app || payload.azp || "chat_system",
  );
  const tokenApps = Array.isArray(payload.apps)
    ? payload.apps.map(normalizeAppName)
    : [];
  const configuredApps = (issuerConfig.apps || []).map(normalizeAppName);
  const allowedApps = tokenApps.length ? tokenApps : configuredApps;
  if (allowedApps.length && !allowedApps.includes(sourceApp)) {
    throw Object.assign(
      new Error("Token is not authorized for this host application"),
      {
        code: "CHAT_AUTH_APP_FORBIDDEN",
      },
    );
  }

  return {
    payload,
    subject: String(subject),
    tenantId: validateTenantId(tenantId),
    sourceApp,
    issuer,
    jti: payload.jti || null,
  };
};

export const authConfigurationSummary = () => ({
  issuers: Object.keys(parseIssuerRegistry()),
  audience: process.env.CHAT_JWT_AUDIENCE || "chat-api",
  requireJti: process.env.CHAT_REQUIRE_JTI !== "false",
});
