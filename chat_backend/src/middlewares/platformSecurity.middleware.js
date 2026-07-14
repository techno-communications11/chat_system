import crypto from "crypto";

const requests = new Map();

export const platformSecurityHeaders = (req, res, next) => {
  const frameAncestors = (process.env.CHAT_FRAME_ANCESTORS || "'self'").trim();
  res.setHeader("Content-Security-Policy", `default-src 'none'; frame-ancestors ${frameAncestors}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("X-Request-Id", req.header("x-request-id") || crypto.randomUUID());
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
};

export const apiRateLimit = (req, res, next) => {
  const now = Date.now();
  const windowMs = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS || 60_000);
  const limit = Number(process.env.CHAT_RATE_LIMIT_MAX || 300);
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const current = requests.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  requests.set(key, bucket);

  res.setHeader("RateLimit-Limit", String(limit));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
  res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  if (requests.size > 10_000) {
    for (const [entryKey, entry] of requests) if (entry.resetAt <= now) requests.delete(entryKey);
  }
  if (bucket.count > limit) {
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ success: false, code: "CHAT_RATE_LIMITED", message: "Too many requests" });
  }
  next();
};

export const requireLegacyAuthEnabled = (_req, res, next) => {
  if (process.env.CHAT_ENABLE_PASSWORD_AUTH === "true") return next();
  return res.status(404).json({ success: false, code: "CHAT_ROUTE_DISABLED", message: "Password authentication is disabled" });
};
