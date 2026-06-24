import { useEffect, useState } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Box } from "@mui/material";
import ChatLauncher from "./ChatSystem/ChatLauncher";
import ChatSystem from "./ChatSystem/Chatsystem";
import { CHAT_APP_BASE_PATH } from "./ChatSystem/chatRoutes";
import { getTokenUser, storeAuthToken, storeChatAppName } from "./utils/authToken";

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
        localStorage.setItem("user", JSON.stringify(tokenUser));
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

    setReady(true);
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

function App() {
  return (
    <Router>
      <TicketingTokenBridge>
        <Routes>
          <Route path="/" element={<Navigate to={CHAT_APP_BASE_PATH} replace />} />
          <Route path={CHAT_APP_BASE_PATH} element={<ChatPage />} />
          <Route path={`${CHAT_APP_BASE_PATH}/:id`} element={<ChatPage />} />
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
