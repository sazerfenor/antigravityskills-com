/**
 * Email verification utilities (v1.7.2)
 * Used to restrict unverified users from certain features
 */

import { respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';

/**
 * Check if email verification is required
 * Returns true if email_verification_enabled is 'true' in config
 */
export async function isEmailVerificationRequired(): Promise<boolean> {
  const configs = await getAllConfigs();
  return configs.email_verification_enabled === 'true' && !!configs.resend_api_key;
}

/**
 * Check if user has verified email
 * @param user User object with emailVerified field
 * @returns true if email is verified or verification is not required
 */
export async function isEmailVerified(user: { emailVerified?: boolean | null }): Promise<boolean> {
  const required = await isEmailVerificationRequired();
  if (!required) return true;
  return user.emailVerified === true;
}

/**
 * Require email verification for protected actions
 * Returns null if verified, or a Response object with error if not
 *
 * Usage:
 * ```
 * const verificationError = await requireEmailVerified(user);
 * if (verificationError) return verificationError;
 * ```
 */
export async function requireEmailVerified(
  user: { emailVerified?: boolean | null },
  errorMessage?: string
): Promise<Response | null> {
  const verified = await isEmailVerified(user);
  if (!verified) {
    return respErr(
      errorMessage || 'Please verify your email before using this feature',
      403
    );
  }
  return null;
}

/**
 * Get error message for unverified email in different locales
 */
export function getEmailVerificationErrorMessage(locale?: string): string {
  const messages: Record<string, string> = {
    en: 'Please verify your email before using this feature',
    zh: '请先验证邮箱后再使用此功能',
  };
  return messages[locale || 'en'] || messages.en;
}
