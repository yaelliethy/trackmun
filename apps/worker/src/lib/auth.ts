import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt } from 'better-auth/plugins';
import * as schema from '../db/schema';
import { Bindings } from '../types/env';
import { DbType } from '../db/client';

export const getAuth = (env: Bindings, db: DbType) => {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        users: schema.users,
        sessions: schema.sessions,
        accounts: schema.accounts,
        verifications: schema.verifications,
        jwkss: schema.jwkss,
      },
      usePlural: true,
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/auth',
    advanced: {
      cookiePrefix: 'better-auth',
      useSecureCookies: env.ENVIRONMENT === 'production',
      sameSite: env.ENVIRONMENT === 'production' ? 'none' : 'lax',
    },
    trustedOrigins: [
      env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ],
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'delegate',
        },
        council: {
          type: 'string',
          required: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      jwt({
        jwt: {
          expirationTime: '30m',
        },
        getCustomClaims: async ({ user }: { user: any }) => {
          return {
            role: user.role,
            council: user.council,
          };
        },
      }),
    ],
    session: {
      expiresIn: 30 * 24 * 60 * 60, // 30 days
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
  });
};

export type Auth = ReturnType<typeof getAuth>;
