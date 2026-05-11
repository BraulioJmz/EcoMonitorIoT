import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_URL || process.env.NEON_AUTH_BASE_URL || '',
  cookies: {
    secret: process.env.JWT_SECRET || process.env.NEON_AUTH_COOKIE_SECRET || '',
  },
});
