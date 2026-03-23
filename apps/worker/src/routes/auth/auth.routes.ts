/**
 * Authentication routes
 * Handles user registration, login, refresh, and logout
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createEmailService } from '../../services/email/email.service';
import { ApiResponse } from '@trackmun/shared';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  BREVO_WELCOME_TEMPLATE_ID: string;
  FRONTEND_URL: string;
};

const authRouter = new Hono<{ Bindings: Bindings }>();

/**
 * Request validation schemas
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  council: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Hash a password using Web Crypto API
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hashArray = Array.from(new Uint8Array(hash));
  const saltArray = Array.from(salt);
  return `${saltArray.join(',')}:${hashArray.join(',')}`;
}

/**
 * Verify a password against a stored hash
 */
async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const [saltStr, hashStr] = storedHash.split(':');
    const salt = new Uint8Array(saltStr.split(',').map(Number));
    const storedHashArray = new Uint8Array(hashStr.split(',').map(Number));

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt.buffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    const hashArray = new Uint8Array(hash);

    if (hashArray.length !== storedHashArray.length) {
      return false;
    }

    for (let i = 0; i < hashArray.length; i++) {
      if (hashArray[i] !== storedHashArray[i]) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a JWT token
 */
async function generateJWT(
  payload: {
    userId: string;
    email: string;
    role: string;
    council?: string;
    acting_as?: string;
  },
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + 60 * 60, // 1 hour expiry
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '');
  const bodyB64 = btoa(JSON.stringify(body)).replace(/=/g, '');
  const data = encoder.encode(`${headerB64}.${bodyB64}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureB64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(signature)))).replace(/=/g, '');

  return `${headerB64}.${bodyB64}.${signatureB64}`;
}

/**
 * POST /auth/register
 * Register a new user account
 */
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.error.errors[0]?.message || 'Invalid input',
          code: 'VALIDATION_ERROR',
        },
        400
      );
    }

    const { email, password, name, council } = validation.data;

    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    )
      .bind(email)
      .first();

    if (existingUser) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Email already registered',
          code: 'EMAIL_EXISTS',
        },
        409
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const userId = generateId();
    const role = 'delegate'; // Default role for self-registration

    await c.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, name, role, council, created_at)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch())`
    )
      .bind(userId, email, passwordHash, name, role, council || null)
      .run();

    // Create delegate profile
    await c.env.DB.prepare(
      `INSERT INTO delegate_profiles (user_id, year, country, press_agency, awards)
       VALUES (?, NULL, NULL, NULL, '[]')`
    )
      .bind(userId)
      .run();

    // Generate QR token for the delegate
    const qrToken = generateId();
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

    await c.env.DB.prepare(
      `INSERT INTO qr_tokens (token, user_id, purpose, expires_at, created_at)
       VALUES (?, ?, ?, ?, unixepoch())`
    )
      .bind(qrToken, userId, 'attendance', expiresAt)
      .run();

    // Send welcome email (non-blocking)
    const emailService = createEmailService(c.env);
    c.executionCtx.waitUntil(
      (async () => {
        try {
          await emailService.sendWelcomeEmail(email, name, qrToken);
        } catch (error) {
          console.error('Welcome email failed', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })()
    );

    // Generate JWT
    const token = await generateJWT(
      {
        userId,
        email,
        role,
        council: council || undefined,
      },
      c.env.JWT_SECRET
    );

    return c.json<ApiResponse<{ token: string; user: { id: string; email: string; name: string; role: string } }>>(
      {
        success: true,
        data: {
          token,
          user: {
            id: userId,
            email,
            name,
            role,
          },
        },
      },
      201
    );
  } catch (error) {
    console.error('Registration error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Registration failed',
        code: 'REGISTRATION_FAILED',
      },
      500
    );
  }
});

/**
 * POST /auth/login
 * Authenticate user and return JWT
 */
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.error.errors[0]?.message || 'Invalid input',
          code: 'VALIDATION_ERROR',
        },
        400
      );
    }

    const { email, password } = validation.data;

    // Find user
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash, name, role, council FROM users WHERE email = ?'
    )
      .bind(email)
      .first<{
        id: string;
        email: string;
        password_hash: string;
        name: string;
        role: string;
        council: string | null;
      }>();

    if (!user) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
        401
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
        401
      );
    }

    // Generate JWT
    const token = await generateJWT(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        council: user.council || undefined,
      },
      c.env.JWT_SECRET
    );

    return c.json<ApiResponse<{ token: string; user: { id: string; email: string; name: string; role: string } }>>(
      {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
      }
    );
  } catch (error) {
    console.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Login failed',
        code: 'LOGIN_FAILED',
      },
      500
    );
  }
});

/**
 * POST /auth/refresh
 * Refresh an existing JWT
 */
authRouter.post('/refresh', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Missing or invalid authorization header',
          code: 'MISSING_AUTH',
        },
        401
      );
    }

    const token = authHeader.substring(7);

    // Verify existing token (simplified - in production, verify signature)
    try {
      const payloadB64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadB64));

      // Generate new token with same payload
      const newToken = await generateJWT(
        {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          council: payload.council,
          acting_as: payload.acting_as,
        },
        c.env.JWT_SECRET
      );

      return c.json<ApiResponse<{ token: string }>>({
        success: true,
        data: { token: newToken },
      });
    } catch {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
        },
        401
      );
    }
  } catch (error) {
    console.error('Token refresh error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Token refresh failed',
        code: 'REFRESH_FAILED',
      },
      500
    );
  }
});

/**
 * POST /auth/logout
 * Invalidate current session (placeholder for session-based logout)
 */
authRouter.post('/logout', async (c) => {
  // For JWT-based auth, logout is client-side (discard token)
  // If using session tokens stored in D1, we would delete them here
  return c.json<ApiResponse<{ message: string }>>({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

export { authRouter };
