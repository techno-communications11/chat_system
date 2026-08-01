import { useEffect, useState } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Box } from "@mui/material";
import ChatLauncher from "./ChatSystem/ChatLauncher";
import ChatSystem from "./ChatSystem/Chatsystem";
import { CHAT_APP_BASE_PATH } from "./ChatSystem/chatRoutes";
import LoginPage from "./LoginPage";
import { getStoredAuthToken, getTokenUser, storeAuthToken, storeChatAppName } from "./utils/authToken";

const tokenParamNames = ["token", "authToken", "access_token"];
const appParamNames = ["app", "appName", "sourceApp"];

const getUrlToken = (url) => {
  for (const name of tokenParamNames) {
    const token = url.searchParams.get(name);
    if (token) return { name, token };
  }

  const hashQuery = url.hash.includes("?") ? url.hash.slice(url.hash.indexOf("?") + 1) : "";
  const hashParams = new URLSearchParams(hashQuery);

  for (const name of tokenParamNames) {
    const token = hashParams.get(name);
    if (token) return { name, token, fromHash: true, hashParams };
  }

  return null;
};

const getHashParams = (url) => {
  const hashQuery = url.hash.includes("?")
    ? url.hash.slice(url.hash.indexOf("?") + 1)
    : "";

  return new URLSearchParams(hashQuery);
};

const getUrlAppName = (url, hashParams) => {
  for (const name of appParamNames) {
    const appName = url.searchParams.get(name) || hashParams.get(name);
    if (appName) return appName;
  }

  return "";
};

const cleanHashParams = (url, hashParams) => {
  const [hashPath = ""] = url.hash.slice(1).split("?");
  const hashSearch = hashParams.toString();
  url.hash = hashSearch ? `${hashPath}?${hashSearch}` : hashPath;
};

function TicketingTokenBridge({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const tokenInfo = getUrlToken(url);
    const hashParams = tokenInfo?.hashParams || getHashParams(url);
    const appName = getUrlAppName(url, hashParams);
    let shouldCleanUrl = false;

    if (appName) {
      storeChatAppName(appName);
      shouldCleanUrl = true;

      for (const name of appParamNames) {
        url.searchParams.delete(name);
        hashParams.delete(name);
      }
    }

    if (tokenInfo) {
      storeAuthToken(tokenInfo.token);
      const tokenUser = getTokenUser();

      if (tokenUser) {
        sessionStorage.setItem("user", JSON.stringify(tokenUser));
      }

      shouldCleanUrl = true;

      if (tokenInfo.fromHash) {
        hashParams.delete(tokenInfo.name);
        cleanHashParams(url, hashParams);
      } else {
        url.searchParams.delete(tokenInfo.name);
      }
    } else if (appName && url.hash.includes("?")) {
      cleanHashParams(url, hashParams);
    }

    if (shouldCleanUrl) {
      window.history.replaceState(
        {},
        document.title,
        `${url.pathname}${url.search}${url.hash}`,
      );
    }

    const embedded = window.parent !== window;
    const configuredOrigins = String(import.meta.env.VITE_CHAT_ALLOWED_PARENT_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    let referrerOrigin = "";
    try { referrerOrigin = document.referrer ? new URL(document.referrer).origin : ""; } catch { /* ignored */ }
    const allowedOrigins = new Set(configuredOrigins.length ? configuredOrigins : [referrerOrigin].filter(Boolean));

    const onHostMessage = (event) => {
      if (!allowedOrigins.has(event.origin) || event.source !== window.parent) return;
      const message = event.data || {};
      if (message.type === "chat:authenticate") {
        storeAuthToken(message.token);
        if (message.appName) storeChatAppName(message.appName);
        const tokenUser = getTokenUser();
        if (tokenUser) sessionStorage.setItem("user", JSON.stringify(tokenUser));
        setReady(Boolean(tokenUser));
        window.parent.postMessage({ type: "chat:authenticated", ok: Boolean(tokenUser) }, event.origin);
      } else if (message.type === "chat:logout") {
        sessionStorage.clear();
        setReady(false);
      } else if (message.type === "chat:set-theme") {
        document.documentElement.dataset.chatTheme = String(message.theme || "light");
      } else if (message.type === "chat:set-language") {
        document.documentElement.lang = String(message.language || "en");
      }
    };

    window.addEventListener("message", onHostMessage);
    if (embedded && !tokenInfo && !getTokenUser()) {
      for (const origin of allowedOrigins) window.parent.postMessage({ type: "chat:ready" }, origin);
    } else {
      setReady(true);
    }

    return () => window.removeEventListener("message", onHostMessage);
  }, []);

  if (!ready) return null;

  return children;
}

function ChatPage() {
  return (
    <Box sx={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <ChatSystem standalone />
    </Box>
  );
}

function ProtectedChatPage() {
  if (!getStoredAuthToken()) return <Navigate to="/login" replace />;

  return <ChatPage />;
}

function App() {
  return (
    <Router>
      <TicketingTokenBridge>
        <Routes>
          <Route path="/" element={<Navigate to={CHAT_APP_BASE_PATH} replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path={CHAT_APP_BASE_PATH} element={<ProtectedChatPage />} />
          <Route path={`${CHAT_APP_BASE_PATH}/:id`} element={<ProtectedChatPage />} />
          <Route
            path="/launcher"
            element={
              <Box
                sx={{
                  minHeight: "100vh",
                  bgcolor: "#1f2937",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChatLauncher />
              </Box>
            }
          />
        </Routes>
      </TicketingTokenBridge>
    </Router>
  );
}

export default App;
