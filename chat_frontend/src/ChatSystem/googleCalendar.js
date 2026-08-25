const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

let googleAccessToken = "";
let googleAccessTokenExpiresAt = 0;
let googleIdentityScriptPromise;

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) resolve();
      else reject(new Error("Google sign-in could not be loaded."));
    };
    script.onerror = () =>
      reject(new Error("Google sign-in could not be loaded."));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

async function getGoogleAccessToken({ forceAccountSelection = false } = {}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      "Google Calendar is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file.",
    );
  }

  if (
    !forceAccountSelection &&
    googleAccessToken &&
    Date.now() < googleAccessTokenExpiresAt - TOKEN_REFRESH_BUFFER_MS
  ) {
    return googleAccessToken;
  }

  await loadGoogleIdentityServices();

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_SCOPE,
      callback: (response) => {
        if (response?.error || !response?.access_token) {
          reject(
            new Error(
              response?.error || "Google Calendar access was declined.",
            ),
          );
          return;
        }

        googleAccessToken = response.access_token;
        googleAccessTokenExpiresAt =
          Date.now() + Number(response.expires_in || 3600) * 1000;
        resolve(googleAccessToken);
      },
      error_callback: () =>
        reject(new Error("Google sign-in was cancelled or blocked.")),
    });

    tokenClient.requestAccessToken({
      // Scheduling must always let the user choose which Google account owns
      // the calendar event, even when another token is already cached.
      prompt: forceAccountSelection ? "select_account" : googleAccessToken ? "" : "consent",
    });
  });
}

function getCalendarErrorMessage(payload) {
  return (
    payload?.error?.message ||
    payload?.error_description ||
    "Google Calendar could not create the event."
  );
}

export async function createGoogleCalendarEvent({
  attendeeEmails = [],
  durationMinutes,
  reminderMinutes,
  startDateTime,
  title,
}) {
  const start = new Date(startDateTime);
  const duration = Number(durationMinutes);
  const reminder = Number(reminderMinutes);

  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw new Error("Choose a future date and time for the call.");
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Choose a valid call duration.");
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const attendees = [
    ...new Set(
      attendeeEmails.map((email) => String(email).trim().toLowerCase()),
    ),
  ]
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    .map((email) => ({ email }));
  const token = await getGoogleAccessToken({ forceAccountSelection: true });
  const end = new Date(start.getTime() + duration * 60_000);
  const event = {
    summary: String(title || "Scheduled call").trim() || "Scheduled call",
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
    reminders: {
      useDefault: false,
      overrides: reminder > 0 ? [{ method: "popup", minutes: reminder }] : [],
    },
  };

  if (attendees.length > 0) event.attendees = attendees;

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(getCalendarErrorMessage(payload));
  return payload;
}
