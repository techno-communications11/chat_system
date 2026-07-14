import test from "node:test";
import assert from "node:assert/strict";
import { google } from "googleapis";
import {
  createMeeting,
  endMeeting,
  GOOGLE_MEET_SCOPES,
} from "../src/Servicess/googleMeet.services.js";

test("uses the least-privilege Meet space creation scope", () => {
  assert.deepEqual(GOOGLE_MEET_SCOPES, [
    "https://www.googleapis.com/auth/meetings.space.created",
  ]);
  assert.equal(typeof google.meet, "function");
});

test("creates a Meet v2 space and returns its URI and code", async () => {
  const requests = [];
  const meetClient = {
    spaces: {
      create: async (request) => {
        requests.push(request);
        return {
          data: {
            name: "spaces/space123",
            meetingUri: "https://meet.google.com/abc-defg-hij",
            meetingCode: "abc-defg-hij",
          },
        };
      },
    },
  };

  const meeting = await createMeeting({ meetClient });
  assert.deepEqual(meeting, {
    name: "spaces/space123",
    meetingUri: "https://meet.google.com/abc-defg-hij",
    meetingCode: "abc-defg-hij",
  });
  assert.deepEqual(requests, [{ requestBody: {} }]);
});

test("ends the active conference using the provider space name", async () => {
  const requests = [];
  const meetClient = {
    spaces: {
      endActiveConference: async (request) => {
        requests.push(request);
        return { data: {} };
      },
    },
  };
  await endMeeting("spaces/space123", { meetClient });
  assert.deepEqual(requests, [{ name: "spaces/space123", requestBody: {} }]);
});

test("rejects invalid provider space names before making a request", async () => {
  await assert.rejects(() => endMeeting("https://attacker.example/space"), {
    code: "CHAT_GOOGLE_MEET_SPACE_INVALID",
  });
});
