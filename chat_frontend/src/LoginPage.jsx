import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import { useNavigate } from "react-router-dom";
import { loginChatService } from "./Services/chat.services";
import { CHAT_APP_BASE_PATH } from "./ChatSystem/chatRoutes";
import { getTokenUser, storeAuthToken, storeChatAppName } from "./utils/authToken";

const getMergedParams = () => {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  const hashQuery = url.hash.includes("?") ? url.hash.slice(url.hash.indexOf("?") + 1) : "";
  const hashParams = new URLSearchParams(hashQuery);

  for (const [key, value] of hashParams.entries()) {
    if (!params.has(key)) params.set(key, value);
  }

  return params;
};

const readLoginParams = () => {
  const params = getMergedParams();

  return {
    login: params.get("login") || params.get("email") || params.get("username") || "",
    password: params.get("password") || "",
    type: params.get("type") || params.get("app") || params.get("appName") || params.get("portal") || "",
    autoLogin: String(params.get("autoLogin") || params.get("auto") || "").toLowerCase() === "true",
  };
};

const removeSensitiveParams = () => {
  const url = new URL(window.location.href);
  let changed = false;

  for (const name of ["password", "autoLogin", "auto"]) {
    if (url.searchParams.has(name)) {
      url.searchParams.delete(name);
      changed = true;
    }
  }

  if (changed) {
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }
};

function LoginPage() {
  const navigate = useNavigate();
  const initialParams = useMemo(readLoginParams, []);
  const [form, setForm] = useState(initialParams);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submittedAutoLogin = useRef(false);

  const submitLogin = useCallback(async (event) => {
    event?.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await loginChatService({
        login: form.login,
        password: form.password,
        type: form.type,
      });
      const token = response.data?.data?.token;
      const user = response.data?.data?.user;

      if (!token) throw new Error("Login did not return a token");

      storeAuthToken(token);
      if (form.type) storeChatAppName(form.type);
      sessionStorage.setItem("user", JSON.stringify(user || getTokenUser()));
      removeSensitiveParams();
      navigate(CHAT_APP_BASE_PATH, { replace: true });
    } catch (loginError) {
      const message =
        loginError.response?.data?.message ||
        loginError.message ||
        "Unable to sign in";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [form.login, form.password, form.type, navigate]);

  useEffect(() => {
    if (!initialParams.autoLogin || submittedAutoLogin.current) return;
    if (!initialParams.login || !initialParams.password) return;

    submittedAutoLogin.current = true;
    submitLogin();
  }, [initialParams.autoLogin, initialParams.login, initialParams.password, submitLogin]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        bgcolor: "#eef3f8",
        display: "grid",
        placeItems: "center",
        px: 2,
      }}
    >
      <Box
        component="form"
        onSubmit={submitLogin}
        sx={{
          width: "100%",
          maxWidth: 380,
          bgcolor: "#ffffff",
          border: "1px solid #d7e0ea",
          borderRadius: 2,
          boxShadow: "0 18px 45px rgba(25, 41, 61, 0.12)",
          p: 3,
        }}
      >
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 0.75 }}>
          Chat login
        </Typography>
        <Typography variant="body2" sx={{ color: "#5d6b7a", mb: 2.5 }}>
          Sign in with your chat account.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="Email or username"
          value={form.login}
          onChange={updateField("login")}
          autoComplete="username"
          fullWidth
          required
          margin="normal"
        />
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={updateField("password")}
          autoComplete="current-password"
          fullWidth
          required
          margin="normal"
        />
        <TextField
          label="Portal type"
          value={form.type}
          onChange={updateField("type")}
          placeholder="ticket_portal"
          autoComplete="organization"
          fullWidth
          margin="normal"
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          startIcon={submitting ? <CircularProgress color="inherit" size={18} /> : <LoginIcon />}
          disabled={submitting}
          sx={{ mt: 2, minHeight: 44, textTransform: "none", fontWeight: 700 }}
        >
          {submitting ? "Signing in" : "Sign in"}
        </Button>
      </Box>
    </Box>
  );
}

export default LoginPage;
