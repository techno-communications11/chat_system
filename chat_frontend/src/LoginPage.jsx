import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useNavigate } from "react-router-dom";
import { loginChatService } from "./Services/chat.services";
import { CHAT_APP_BASE_PATH } from "./ChatSystem/chatRoutes";
import { getTokenUser, storeAuthToken } from "./utils/authToken";

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

function FaceBubble({ color, size, top, left, rotate = 0, expression = "smile" }) {
  return (
    <Box
      sx={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: "48% 52% 50% 45%",
        bgcolor: color,
        transform: `rotate(${rotate}deg)`,
        boxShadow: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 1, sm: 1.5 },
        zIndex: 1,
        "&::before": {
          content: '""',
          position: "absolute",
          width: "28%",
          height: "8%",
          bgcolor: "rgba(25,25,35,.88)",
          borderRadius: 99,
          bottom: "25%",
          left: "36%",
          transform: expression === "surprised" ? "rotate(90deg)" : "none",
        },
      }}
    >
      <Box sx={{ width: "11%", height: "16%", bgcolor: "#232333", borderRadius: "50%", mt: "-18%" }} />
      <Box sx={{ width: "11%", height: "16%", bgcolor: "#232333", borderRadius: "50%", mt: "-18%" }} />
    </Box>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const initialParams = useMemo(readLoginParams, []);
  const [form, setForm] = useState(initialParams);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submittedAutoLogin = useRef(false);

  const submitLogin = useCallback(async (event) => {
    event?.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await loginChatService({
        login: form.login,
        password: form.password,
      });
      const token = response.data?.data?.token;
      const user = response.data?.data?.user;

      if (!token) throw new Error("Login did not return a token");

      storeAuthToken(token);
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
  }, [form.login, form.password, navigate]);

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
      sx={{ minHeight: "100vh", width: "100vw", bgcolor: "#f2f0ff", display: "grid", placeItems: "center", p: { xs: 1.5, sm: 3 } }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 960,
          minHeight: { xs: "auto", sm: 590 },
          bgcolor: "#ffffff",
          borderRadius: { xs: 4, sm: 7 },
          boxShadow: "none",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        }}
      >
        <Box sx={{ position: "relative", minHeight: { xs: 245, sm: 590 }, overflow: "hidden", bgcolor: "#fbfaff" }}>
          <Box sx={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 20%, #fff 0 18%, transparent 48%), linear-gradient(145deg, #e8f8d2 0%, #f9d8eb 48%, #d8edff 100%)" }} />
          <Box sx={{ position: "absolute", top: { xs: 18, sm: 48 }, left: { xs: 18, sm: 38 }, zIndex: 3, color: "#252337" }}>
            <Box sx={{ width: 46, height: 46, borderRadius: 3, bgcolor: "#6f2da8", color: "#fff", display: "grid", placeItems: "center", mb: 1 }}>
              <ChatBubbleOutlineIcon />
            </Box>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, sm: 27 }, letterSpacing: "-.04em" }}>Pingly</Typography>
            <Typography sx={{ color: "#625f75", fontSize: { xs: 11, sm: 13 }, mt: .25 }}>Stay close. Chat simply.</Typography>
          </Box>
          <FaceBubble color="#b9e879" size={{ xs: 102, sm: 165 }} top={{ xs: 82, sm: 128 }} left={{ xs: "8%", sm: "10%" }} rotate={-10} />
          <FaceBubble color="#f68579" size={{ xs: 82, sm: 130 }} top={{ xs: 45, sm: 86 }} left={{ xs: "62%", sm: "65%" }} rotate={12} expression="surprised" />
          <FaceBubble color="#83c8fa" size={{ xs: 98, sm: 155 }} top={{ xs: 148, sm: 300 }} left={{ xs: "28%", sm: "20%" }} rotate={-8} />
          <FaceBubble color="#ffd46d" size={{ xs: 105, sm: 165 }} top={{ xs: 150, sm: 310 }} left={{ xs: "66%", sm: "61%" }} rotate={8} />
          <Box sx={{ position: "absolute", zIndex: 4, top: { xs: 120, sm: 235 }, left: { xs: "47%", sm: "48%" }, bgcolor: "#242332", color: "#fff", px: 1.5, py: .75, borderRadius: "18px 18px 18px 4px", fontWeight: 800, fontSize: { xs: 11, sm: 14 }, transform: "rotate(-8deg)" }}>
            Hello!
          </Box>
        </Box>

        <Box component="form" onSubmit={submitLogin} sx={{ p: { xs: 3, sm: 6 }, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Typography component="h1" sx={{ fontWeight: 900, fontSize: { xs: 27, sm: 34 }, color: "#26243a", letterSpacing: "-.05em" }}>
            Welcome back
          </Typography>
          <Typography sx={{ color: "#77748a", mt: .75, mb: 3.5, fontSize: 14 }}>
            Sign in to continue your conversations.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <TextField
            label="Email or username"
            value={form.login}
            onChange={updateField("login")}
            autoComplete="username"
            fullWidth
            required
            margin="normal"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "#faf9ff" }, "& input:-webkit-autofill": { WebkitBoxShadow: "0 0 0 100px #faf9ff inset", WebkitTextFillColor: "#292640" } }}
          />
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={updateField("password")}
            autoComplete="current-password"
            fullWidth
            required
            margin="normal"
            InputProps={{
              startAdornment: <InputAdornment position="start"><LockRoundedIcon sx={{ color: "#9a96ad", fontSize: 19 }} /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showPassword ? "Hide password" : "Show password"}>
                    <IconButton edge="end" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} onMouseDown={(event) => event.preventDefault()}>
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: "#faf9ff" }, "& input:-webkit-autofill": { WebkitBoxShadow: "0 0 0 100px #faf9ff inset", WebkitTextFillColor: "#292640" } }}
          />
          <Button type="submit" variant="contained" fullWidth endIcon={!submitting && <LoginIcon />} startIcon={submitting && <CircularProgress color="inherit" size={18} />} disabled={submitting} sx={{ mt: 3, minHeight: 52, borderRadius: 3, textTransform: "none", fontWeight: 800, fontSize: 15, bgcolor: "#6f2da8", boxShadow: "none", "&:hover": { bgcolor: "#5d238f", boxShadow: "none" } }}>
            {submitting ? "Signing in" : "Sign in"}
          </Button>
          <Typography sx={{ textAlign: "center", color: "#aaa7b7", fontSize: 12, mt: 3 }}>Your conversations are waiting for you.</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default LoginPage;
