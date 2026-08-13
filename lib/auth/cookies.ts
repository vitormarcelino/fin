export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ?? "fin_session";

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_RENEWAL_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // 15 days
