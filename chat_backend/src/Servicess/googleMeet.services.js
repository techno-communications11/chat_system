import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import "dotenv/config";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";

export const GOOGLE_MEET_SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.created",
];

const credentialsPath = () => path.resolve(
  process.env.GOOGLE_MEET_CREDENTIALS_PATH || path.join(process.cwd(), "client_secret.json"),
);
const tokenPath = () => path.resolve(
  process.env.GOOGLE_MEET_TOKEN_PATH || path.join(process.cwd(), "token.json"),
);

let cachedAuthClient = null;

export class GoogleMeetError extends Error {
  constructor(message, { status = 502, code = "CHAT_GOOGLE_MEET_FAILED", details } = {}) {
    super(message);
    this.name = "GoogleMeetError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, "utf8"));

const loadSavedCredentials = async () => {
  try {
    return google.auth.fromJSON(await readJson(tokenPath()));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new GoogleMeetError("Unable to read Google Meet token.json", {
      status: 503,
      code: "CHAT_GOOGLE_MEET_TOKEN_INVALID",
      details: error.message,
    });
  }
};

const saveCredentials = async (authClient) => {
  const credentials = await readJson(credentialsPath());
  const client = credentials.installed || credentials.web;
  if (!client?.client_id || !client?.client_secret) {
    throw new GoogleMeetError("client_secret.json is not a Desktop OAuth credential", {
      status: 503,
      code: "CHAT_GOOGLE_MEET_CREDENTIALS_INVALID",
    });
  }
  if (!authClient.credentials?.refresh_token) {
    throw new GoogleMeetError("Google did not return a refresh token. Revoke the app grant and authorize again.", {
      status: 503,
      code: "CHAT_GOOGLE_MEET_REFRESH_TOKEN_MISSING",
    });
  }

  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: client.client_id,
    client_secret: client.client_secret,
    refresh_token: authClient.credentials.refresh_token,
  }, null, 2);
  await fs.writeFile(tokenPath(), payload, { encoding: "utf8", mode: 0o600 });
};

/**
 * Runs the one-time Desktop OAuth browser flow and saves token.json.
 *
 * Initial login:
 *   1. Put client_secret.json in chat_backend (or set GOOGLE_MEET_CREDENTIALS_PATH).
 *   2. Run `npm run google-meet:auth` on a computer with a browser.
 *   3. Sign in with the Gmail account that should own newly created meetings.
 *   4. Approve the requested Meet scope. token.json is then reused and refreshed
 *      automatically, so ordinary chat users never see Google's consent screen.
 *
 * Delete token.json (or revoke the grant in the Google Account) to switch accounts.
 */
export const authenticateGoogleMeet = async ({ forceBrowser = false } = {}) => {
  if (!forceBrowser && cachedAuthClient) return cachedAuthClient;
  if (!forceBrowser) {
    const saved = await loadSavedCredentials();
    if (saved) {
      cachedAuthClient = saved;
      return saved;
    }
  }

  try {
    const authClient = await authenticate({
      scopes: GOOGLE_MEET_SCOPES,
      keyfilePath: credentialsPath(),
    });
    await saveCredentials(authClient);
    cachedAuthClient = authClient;
    return authClient;
  } catch (error) {
    if (error instanceof GoogleMeetError) throw error;
    throw new GoogleMeetError("Google Meet browser authentication failed", {
      status: 503,
      code: "CHAT_GOOGLE_MEET_AUTH_FAILED",
      details: error.message,
    });
  }
};

const getNonInteractiveAuth = async () => {
  if (cachedAuthClient) return cachedAuthClient;
  const saved = await loadSavedCredentials();
  if (!saved) {
    throw new GoogleMeetError("Google Meet token.json is missing. Run npm run google-meet:auth first.", {
      status: 503,
      code: "CHAT_GOOGLE_MEET_NOT_AUTHORIZED",
    });
  }
  cachedAuthClient = saved;
  return saved;
};

const normalizeGoogleError = (error, action) => {
  if (error instanceof GoogleMeetError) return error;
  return new GoogleMeetError(`Google Meet ${action} failed`, {
    status: error?.response?.status === 401 || error?.response?.status === 403 ? 503 : 502,
    code: "CHAT_GOOGLE_MEET_API_ERROR",
    details: error?.response?.data?.error?.message || error.message,
  });
};

/**
 * Creates a Google Meet API v2 space and returns its stable resource name plus
 * the user-facing meeting URI and code. Pass meetClient only in tests.
 */
export const createMeeting = async ({ authClient, meetClient, requestBody = {} } = {}) => {
  try {
    const auth = authClient || (meetClient ? undefined : await getNonInteractiveAuth());
    const meet = meetClient || google.meet({ version: "v2", auth });
    const response = await meet.spaces.create({ requestBody });
    const { name, meetingUri, meetingCode } = response.data || {};
    if (!name || !meetingUri || !meetingCode) {
      throw new GoogleMeetError("Google Meet returned an incomplete meeting space");
    }
    return { name, meetingUri, meetingCode };
  } catch (error) {
    throw normalizeGoogleError(error, "space creation");
  }
};

export const endMeeting = async (spaceName, { authClient, meetClient } = {}) => {
  if (!/^spaces\/[A-Za-z0-9_-]+$/.test(String(spaceName || ""))) {
    throw new GoogleMeetError("Invalid Google Meet space name", {
      status: 400,
      code: "CHAT_GOOGLE_MEET_SPACE_INVALID",
    });
  }
  try {
    const auth = authClient || (meetClient ? undefined : await getNonInteractiveAuth());
    const meet = meetClient || google.meet({ version: "v2", auth });
    await meet.spaces.endActiveConference({ name: spaceName, requestBody: {} });
    return {};
  } catch (error) {
    throw normalizeGoogleError(error, "conference termination");
  }
};

// Compatibility exports used by the existing chat service layer.
export const createGoogleMeetSpace = () => createMeeting();
export const endGoogleMeetConference = (spaceName) => endMeeting(spaceName);
export const clearGoogleMeetAuthCache = () => { cachedAuthClient = null; };
