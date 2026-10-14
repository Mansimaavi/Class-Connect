// Runs before every test file, before any app module reads its config.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-0123456789abcdef";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-0123456789abcdef";
process.env.TWO_FACTOR_ENCRYPTION_KEY ??= "test-2fa-key-0123456789abcdef";
process.env.CLIENT_URL ??= "http://localhost:5173";
process.env.LOG_LEVEL ??= "silent";

// Make sure tests never talk to real third-party services.
delete process.env.MAIL_HOST;
delete process.env.CLOUDINARY_CLOUD_NAME;
delete process.env.GEMINI_API_KEY;
delete process.env.API_KEY4;
