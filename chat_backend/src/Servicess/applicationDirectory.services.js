const normalizeAppName = (value) =>
  String(value || "chat_system")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "chat_system";

const getProviderConfig = (appName) => {
  const normalizedAppName = normalizeAppName(appName);
  const envKey = `CHAT_PROVIDER_${normalizedAppName.toUpperCase()}_USERS_URL`;
  const usersUrl = process.env[envKey] || "";

  if (usersUrl) {
    return { usersUrl };
  }

  try {
    const configuredProviders = JSON.parse(process.env.CHAT_PROVIDER_USERS_URLS || "{}");
    return {
      usersUrl:
        configuredProviders[appName] ||
        configuredProviders[normalizedAppName] ||
        configuredProviders.default ||
        "",
    };
  } catch {
    return { usersUrl: "" };
  }
};

const pickUserId = (user) =>
  user?.id ||
  user?.userId ||
  user?.user_id ||
  user?.appUserId ||
  user?.employeeId ||
  user?.customerId ||
  user?.email ||
  "";

export const normalizeDirectoryUser = (user, appName) => {
  const id = String(pickUserId(user) || "").trim();
  const email = user?.email || user?.email_id || user?.mail || user?.userEmail || "";
  const name =
    user?.name ||
    user?.displayName ||
    user?.display_name ||
    user?.username ||
    email ||
    id;

  if (!id) return null;

  const normalizedUser = {
    ...user,
    id,
    user_id: id,
    appUserId: id,
    email,
    email_id: email,
    username: user?.username || email || id,
    name,
    displayName: name,
    display_name: name,
    role: user?.role || user?.userRole || user?.type || "member",
    roles: user?.roles || (user?.role ? [user.role] : []),
    provider: appName,
  };

  return {
    ...normalizedUser,
    profile: {
      id,
      email: normalizedUser.email,
      username: normalizedUser.username,
      name: normalizedUser.name,
      displayName: normalizedUser.displayName,
      avatarUrl: normalizedUser.avatarUrl || null,
      status: normalizedUser.status || null,
      presence: normalizedUser.presence || normalizedUser.status || null,
      role: normalizedUser.role,
      roles: normalizedUser.roles,
      metadata: normalizedUser.metadata || {},
    },
  };
};

const getArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.data?.users)) return payload.data.users;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const fetchApplicationUsers = async ({ actor, query = {} }) => {
  const sourceApp = actor.sourceApp || actor.appName;
  const { usersUrl } = getProviderConfig(sourceApp);

  if (!usersUrl) return null;

  const url = new URL(usersUrl);
  const params = {
    app: sourceApp,
    tenantId: actor.tenantId || actor.appName,
    currentUserId: actor.appUserId,
    userId: actor.appUserId,
    email: actor.appUserEmail,
    search: query.search || "",
    limit: query.limit || 100,
    excludeSelf: query.excludeSelf ? "true" : "false",
  };

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-chat-app-name": sourceApp,
      "x-chat-tenant-id": actor.tenantId || actor.appName,
      ...(actor.authToken ? { Authorization: `Bearer ${actor.authToken}` } : {}),
    },
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    const error = new Error("Application user directory request failed");
    error.status = response.status;
    error.code = "CHAT_APP_DIRECTORY_FAILED";
    error.details = details;
    throw error;
  }

  const payload = await response.json();
  const search = String(query.search || "").trim().toLowerCase();

  return getArrayPayload(payload)
    .map((user) => normalizeDirectoryUser(user, sourceApp))
    .filter(Boolean)
    .filter((user) => !query.excludeSelf || String(user.id) !== String(actor.appUserId))
    .filter((user) => {
      if (!search) return true;

      return [user.id, user.email, user.name, user.username]
        .some((value) => String(value || "").toLowerCase().includes(search));
    })
    .slice(0, Number(query.limit) || 100);
};

export const findApplicationUser = async ({ actor, userId }) => {
  const users = await fetchApplicationUsers({
    actor,
    query: { search: userId, limit: 100, excludeSelf: false },
  });

  if (!users) return null;

  return users.find((user) => String(user.id) === String(userId)) || null;
};

export { normalizeAppName };
