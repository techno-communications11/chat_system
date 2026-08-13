import { useEffect, useMemo, useState } from "react";
import { CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { ThemeModeContext } from "./themeMode";

const THEME_STORAGE_KEY = "chat-theme-mode";

const getInitialMode = () => {
  const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedMode === "dark" || storedMode === "light") return storedMode;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);
  const theme = useMemo(
    () =>
      createTheme({
        typography: {
          fontFamily: 'Inter, Roboto, "SF Pro Display", "SF Pro Text", "Open Sans", Arial, sans-serif',
          h6: { fontWeight: 700, letterSpacing: "-0.01em" },
          button: { fontWeight: 600, textTransform: "none" },
        },
        shape: { borderRadius: 8 },
        palette: {
          mode,
          primary: { main: "#6750e8", dark: "#4f39c6", light: "#8b7cf4" },
          secondary: { main: "#14b8a6" },
          divider: mode === "dark" ? "#2b3142" : "#e7eaf2",
          background: mode === "dark"
            ? { default: "#0f1220", paper: "#171b2b" }
            : { default: "#f5f7fb", paper: "#ffffff" },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: mode === "dark" ? "#0f1220" : "#f5f7fb",
                color: mode === "dark" ? "#d8def0" : "#17213a",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: { backgroundImage: "none" },
            },
          },
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
              root: { borderRadius: 10, minHeight: 38, paddingInline: 14, transition: "transform 160ms ease, box-shadow 160ms ease" },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: { borderRadius: 10, transition: "background-color 160ms ease, color 160ms ease" },
            },
          },
          MuiTextField: {
            defaultProps: { size: "small" },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 11,
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#6750e8" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 2 },
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: { borderRadius: 10, minHeight: 42, transition: "background-color 160ms ease, transform 160ms ease" },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: { borderRadius: 14, border: "1px solid", borderColor: "divider", boxShadow: mode === "dark" ? "0 18px 45px rgba(0,0,0,.35)" : "0 18px 45px rgba(35,42,70,.14)" },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { borderRadius: 6, fontWeight: 600 },
            },
          },
        },
      }),
    [mode],
  );

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    document.documentElement.dataset.chatTheme = mode;
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      isDarkMode: mode === "dark",
      setMode,
      toggleMode: () => setMode((current) => current === "dark" ? "light" : "dark"),
    }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
