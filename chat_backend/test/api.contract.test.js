import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { createApp } from "../src/app.js";

const app = createApp();
let server;
let baseUrl;

test.before(async () => {
  server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(
  () =>
    new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);

const request = (method, path) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      `${baseUrl}${path}`,
      { method, headers: { Accept: "application/json" } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });

test("health and documentation endpoints are public", async () => {
  assert.equal((await request("GET", "/ping")).status, 200);
  assert.equal((await request("GET", "/api/v1/health")).status, 200);
  const docs = await request("GET", "/api-docs.json");
  assert.equal(docs.status, 200);
  const document = JSON.parse(docs.body);
  assert.equal(document.openapi, "3.0.3");
  assert.ok(Object.keys(document.paths).length >= 30);
});

const protectedRoutes = [
  ["GET", "/me"],
  ["PATCH", "/me/status"],
  ["PATCH", "/me/avatar"],
  ["GET", "/users"],
  ["GET", "/users/1"],
  ["GET", "/roles"],
  ["POST", "/roles"],
  ["GET", "/conversations"],
  ["GET", "/groups"],
  ["GET", "/channels"],
  ["POST", "/channels"],
  ["POST", "/channels/1/join"],
  ["GET", "/messages/search"],
  ["GET", "/admin/audit-logs"],
  ["POST", "/conversations/direct/1"],
  ["POST", "/conversations/groups"],
  ["PATCH", "/conversations/1"],
  ["POST", "/conversations/1/members"],
  ["DELETE", "/conversations/1/members/2"],
  ["POST", "/conversations/1/leave"],
  ["POST", "/conversations/1/read"],
  ["GET", "/conversations/1/messages"],
  ["POST", "/conversations/1/messages"],
  ["PATCH", "/conversations/1/messages/1"],
  ["DELETE", "/conversations/1/messages/1"],
  ["DELETE", "/conversations/1/messages"],
  ["PATCH", "/conversations/1/messages/1/pin"],
  ["POST", "/messages/direct/1"],
  ["POST", "/messages/multiple"],
  ["POST", "/messages/broadcast"],
  ["POST", "/conversations/1/files"],
  ["POST", "/conversations/1/calls"], ["GET", "/calls/active"],
  ["POST", "/conversations/1/calls/call-1/end"],
  ["POST", "/conversations/1/calls/call-1/respond"],
  ["POST", "/conversations/1/messages/1/reactions"],
  ["DELETE", "/conversations/1/messages/1/reactions/%F0%9F%91%8D"],
];

for (const [method, path] of protectedRoutes) {
  test(`${method} /api/v1/chat${path} requires authentication`, async () => {
    const response = await request(method, `/api/v1/chat${path}`);
    assert.equal(response.status, 401);
    assert.equal(JSON.parse(response.body).code, "CHAT_AUTH_REQUIRED");
  });
}

test("legacy password endpoints expose their configured contract", async () => {
  const loginStatus = (await request("POST", "/api/v1/chat/auth/login")).status;
  const registerStatus = (await request("POST", "/api/v1/chat/auth/register"))
    .status;
  assert.ok([400, 404].includes(loginStatus));
  assert.ok([400, 404].includes(registerStatus));
});
