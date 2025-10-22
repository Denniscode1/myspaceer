import { beforeAll, afterAll, vi } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test_session_secret';
  process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000';
});

afterAll(() => {
  // Cleanup hooks
});
