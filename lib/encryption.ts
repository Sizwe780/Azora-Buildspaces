import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const IV_LENGTH = 16;

/**
 * Encrypts a plain text string using AES-256-GCM.
 * @param text The plain text string to encrypt.
 * @returns The encrypted string in format iv:encryptedText:authTag
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypts a previously encrypted string.
 * @param text The encrypted string in format iv:encryptedText:authTag.
 * @returns The decrypted plain text string.
 */
export function decrypt(text: string): string {
  const parts = text.split(':');
  if (parts.length !== 3) throw new Error('Invalid encryption format');
  const [ivHex, encryptedText, authTagHex] = parts;
  const iv = Buffer.from(ivHex as string, 'hex');
  const authTag = Buffer.from(authTagHex as string, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText as string, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
