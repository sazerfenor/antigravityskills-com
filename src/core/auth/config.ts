import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { oneTap } from 'better-auth/plugins';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { getAllConfigs, Configs } from '@/shared/models/config';
import {
  getCookieFromCtx,
  getHeaderValue,
  guessLocaleFromAcceptLanguage,
} from '@/shared/lib/cookie';
import { getClientIp } from '@/shared/lib/ip';
import { grantRoleForNewUser } from '@/shared/services/rbac';
import { getEmailServiceWithConfigs } from '@/shared/services/email';
import { VerifyEmail } from '@/shared/blocks/email/verify-email';

// Rate limiting for verification emails: 60 seconds between sends
const VERIFICATION_EMAIL_MIN_INTERVAL_MS = 60_000;
const recentVerificationEmailSentAt = new Map<string, number>();

// Static auth options - NO database connection
// This ensures zero database calls during build time
export const authOptions = {
  appName: envConfigs.app_name,
  baseURL: envConfigs.auth_url,
  secret: envConfigs.auth_secret,
  trustedOrigins: envConfigs.app_url 
    ? [envConfigs.app_url, envConfigs.auth_url].filter(Boolean) 
    : [],
  advanced: {
    database: {
      generateId: () => getUuid(),
    },
    // Use secure cookies only in production (HTTPS)
    useSecureCookies: envConfigs.app_url?.startsWith('https://') ?? false,
  },
  // 🚨 安全修复：显式定义 Session 策略
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 天有效期
    updateAge: 60 * 60 * 24,     // 每天活跃后刷新
  },
  emailAndPassword: {
    enabled: true,
  },
  // 🚨 安全修复：生产环境禁用详细日志，防止敏感信息泄露
  logger: {
    verboseLogging: process.env.NODE_ENV !== 'production',
    disabled: process.env.NODE_ENV === 'production',
  },
};

// Dynamic auth options - WITH database connection
// Only used in API routes that actually need database access
export async function getAuthOptions() {
  // Debug logging disabled to reduce console noise
  // console.log('[AUTH CONFIG] Building Auth Options...');
  
  // Try to get database connection - works with both DATABASE_URL and Hyperdrive
  let database = null;
  try {
    const dbInstance = db();
    database = drizzleAdapter(dbInstance, {
      provider: 'pg',
      schema: schema,
    });
  } catch (error: any) {
    console.error('[AUTH CONFIG] Failed to create database adapter:', error.message);
  }

  const configs = await getAllConfigs();

  // Check if email verification is enabled (requires both config flag and Resend API key)
  const emailVerificationEnabled =
    configs.email_verification_enabled === 'true' && !!configs.resend_api_key;

  const result = {
    ...authOptions,
    // Add database connection only when actually needed (runtime)
    database,
    // User registration source tracking (v1.6.3)
    user: {
      additionalFields: {
        utmSource: {
          type: 'string',
          input: false,
          required: false,
          defaultValue: '',
        },
        registrationIp: {
          type: 'string',
          input: false,
          required: false,
          defaultValue: '',
        },
        registrationLocale: {
          type: 'string',
          input: false,
          required: false,
          defaultValue: '',
        },
      },
    },
    // Database hooks for user registration tracking
    databaseHooks: {
      user: {
        create: {
          before: async (user: any, ctx: any) => {
            try {
              // 1. Record IP address
              const ip = await getClientIp();
              if (ip) {
                user.registrationIp = ip.slice(0, 50);
              }

              // 2. Record locale (prefer cookie, fallback to accept-language)
              const localeFromCookie = getCookieFromCtx(ctx, 'NEXT_LOCALE');
              const localeFromHeader = guessLocaleFromAcceptLanguage(
                getHeaderValue(ctx, 'accept-language')
              );
              const locale = localeFromCookie || localeFromHeader || '';
              if (locale) {
                user.registrationLocale = locale.slice(0, 20);
              }

              // 3. Record UTM source (from cookie)
              const rawUtm = getCookieFromCtx(ctx, 'utm_source') || '';
              if (rawUtm) {
                try {
                  const sanitized = decodeURIComponent(rawUtm)
                    .replace(/[^\w\-.:]/g, '')
                    .slice(0, 100);
                  if (sanitized) {
                    user.utmSource = sanitized;
                  }
                } catch {
                  // Invalid URI encoding, skip
                }
              }
            } catch (e) {
              console.error('[AUTH] Error in user.create.before hook:', e);
            }
            return user;
          },
          after: async (user: any) => {
            try {
              // Grant initial credits for new user (v1.8.0)
              const { grantCreditsForNewUser } = await import(
                '@/shared/models/credit'
              );
              await grantCreditsForNewUser(user);

              // Grant initial role for new user (v1.6.2)
              await grantRoleForNewUser(user);
            } catch (e) {
              console.error('[AUTH] Error in user.create.after hook:', e);
            }
          },
        },
      },
    },
    emailAndPassword: {
      enabled: configs.email_auth_enabled !== 'false',
      requireEmailVerification: emailVerificationEnabled,
      // Avoid creating a session immediately after sign up when verification is required
      autoSignIn: emailVerificationEnabled ? false : true,
    },
    // Email verification configuration (v1.7.2)
    ...(emailVerificationEnabled
      ? {
          emailVerification: {
            // We explicitly send verification emails from the UI with a callbackURL
            // (redirecting to /verify-email). Disabling automatic sends avoids duplicates.
            sendOnSignUp: false,
            sendOnSignIn: false,
            // After user clicks the verification link, create session automatically
            autoSignInAfterVerification: true,
            // 24 hours link expiry
            expiresIn: 60 * 60 * 24,
            sendVerificationEmail: async (
              { user, url }: { user: any; url: string; token: string },
              _request?: Request
            ) => {
              try {
                // Rate limiting: prevent duplicate sends within 60 seconds
                const key = String(user?.email || '').toLowerCase();
                const now = Date.now();
                const last = recentVerificationEmailSentAt.get(key) || 0;
                if (key && now - last < VERIFICATION_EMAIL_MIN_INTERVAL_MS) {
                  console.log('[AUTH] Skipping verification email - rate limited:', key);
                  return;
                }
                if (key) {
                  recentVerificationEmailSentAt.set(key, now);
                }

                const emailService = getEmailServiceWithConfigs(configs as Configs);
                // Use app_logo from configs (database) or fallback to /logo.png
                const appLogo = configs.app_logo || '/logo.png';
                const logoUrl = appLogo.startsWith('http')
                  ? appLogo
                  : `${envConfigs.app_url}${appLogo.startsWith('/') ? '' : '/'}${appLogo}`;

                await emailService.sendEmail({
                  to: user.email,
                  subject: `Verify your email - ${envConfigs.app_name}`,
                  react: VerifyEmail({
                    appName: envConfigs.app_name,
                    logoUrl,
                    url,
                  }),
                });
                console.log('[AUTH] Verification email sent to:', user.email);
              } catch (e) {
                console.error('[AUTH] Failed to send verification email:', e);
              }
            },
          },
        }
      : {}),
    socialProviders: await getSocialProviders(configs),
    plugins:
      configs.google_client_id && configs.google_one_tap_enabled === 'true'
        ? [oneTap()]
        : [],
  };
  
  return result;
}

export async function getSocialProviders(configs: Record<string, string>) {
  // get configs from db
  const providers: any = {};

  if (configs.google_client_id && configs.google_client_secret) {
    providers.google = {
      clientId: configs.google_client_id,
      clientSecret: configs.google_client_secret,
    };
  }

  if (configs.github_client_id && configs.github_client_secret) {
    providers.github = {
      clientId: configs.github_client_id,
      clientSecret: configs.github_client_secret,
    };
  }

  return providers;
}

export function getDatabaseProvider(
  provider: string
): 'sqlite' | 'pg' | 'mysql' {
  switch (provider) {
    case 'd1':
    case 'sqlite':
      return 'sqlite'; // D1 uses SQLite syntax
    case 'postgresql':
      return 'pg';
    case 'mysql':
      return 'mysql';
    default:
      throw new Error(
        `Unsupported database provider for auth: ${envConfigs.database_provider}`
      );
  }
}
