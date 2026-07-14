import test from "node:test";
import assert from "node:assert/strict";
import { toCallPayload } from "../src/Servicess/chatCallLifecycle.services.js";

test("call payload hides Meet details while a recipient is still ringing", () => {
  const payload = toCallPayload({
    callId: "call-1",
    conversationId: 42,
    type: "video",
    status: "ringing",
    provider: "google_meet",
    providerSpaceName: null,
    meetingUri: null,
    meetingCode: null,
    startedByUserId: "user-1",
    startedAt: new Date("2026-01-01T00:00:00Z"),
    endedAt: null,
    metadata: { startedBy: { name: "Caller" } },
  });
  assert.equal(payload.status, "ringing");
  assert.equal(payload.startedBy.id, "user-1");
  assert.equal(payload.callUrl, undefined);
  assert.equal(payload.providerSpaceName, undefined);
});

test("accepted call payload includes the provider join information", () => {
  const payload = toCallPayload({
    callId: "call-2",
    conversationId: 42,
    type: "audio",
    status: "accepted",
    provider: "google_meet",
    providerSpaceName: "spaces/space123",
    meetingUri: "https://meet.google.com/abc-defg-hij",
    meetingCode: "abc-defg-hij",
    startedByUserId: "user-1",
    startedAt: new Date("2026-01-01T00:00:00Z"),
    endedAt: null,
    metadata: { startedBy: { name: "Caller" }, acceptedBy: { id: "user-2" } },
  });
  assert.equal(payload.status, "accepted");
  assert.equal(payload.callUrl, "https://meet.google.com/abc-defg-hij");
  assert.equal(payload.acceptedBy.id, "user-2");
});
