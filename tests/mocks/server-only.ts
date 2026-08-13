// Vitest alias target for the "server-only" package (see vitest.config.mts).
// The real package throws unconditionally unless resolved through the
// "react-server" export condition, which only a Next.js-aware bundler
// provides. This is an intentional no-op stand-in for tests.
export {};
