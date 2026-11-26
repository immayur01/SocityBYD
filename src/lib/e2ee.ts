/**
 * E2EE (End-to-End Encryption) for 1-on-1 Direct Messages
 * ---------------------------------------------------------
 * Uses TweetNaCl (pure-JS, Expo Go compatible) box encryption:
 *   - Key generation: nacl.box.keyPair()
 *   - Encryption:     nacl.box(message, nonce, recipientPubKey, senderSecKey)
 *   - Decryption:     nacl.box.open(cipherBox, nonce, senderPubKey, recipientSecKey)
 *
 * Private keys are stored ONLY in expo-secure-store (never uploaded to Supabase).
 * Public keys are stored in public.profiles.public_key (base64 encoded).
 *
 * Encrypted payload format: "e2ee:v1:<nonceBase64>:<cipherBoxBase64>"
 * Any message NOT starting with "e2ee:v1:" is treated as plain text (backwards compat).
 */

import nacl from 'tweetnacl';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

// Seed nacl PRNG with expo-crypto (native-safe, no native modules)
nacl.setPRNG((x: Uint8Array, n: number) => {
  const bytes = Crypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) {
    x[i] = bytes[i];
  }
});

const PRIVKEY_PREFIX = 'ashtavinayak_e2ee_privkey_';
const E2EE_PREFIX = 'e2ee:v1:';

// --- Base64 helpers (pure-JS, no Buffer needed) ---

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// --- Key pair management ---

/**
 * Returns the user's E2EE key pair, generating and storing it if it doesn't exist.
 * Private key → expo-secure-store (device-only)
 * Public key  → public.profiles.public_key (Supabase)
 */
export async function ensureUserKeyPair(
  userId: string
): Promise<{ publicKey: string; secretKey: string }> {
  const storeKey = `${PRIVKEY_PREFIX}${userId}`;

  // 1. Check for existing private key on device
  const existingSecretB64 = await SecureStore.getItemAsync(storeKey);

  if (existingSecretB64) {
    // We have a private key stored. Fetch the matching public key from DB.
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('id', userId)
        .single();
      if (data?.public_key) {
        return { publicKey: data.public_key, secretKey: existingSecretB64 };
      }
    }
    // If DB is out of sync, re-derive the public key from the secret
    const secretBytes = fromBase64(existingSecretB64);
    const keyPair = nacl.box.keyPair.fromSecretKey(secretBytes);
    const publicKey = toBase64(keyPair.publicKey);

    if (isSupabaseConfigured) {
      await supabase
        .from('profiles')
        .update({ public_key: publicKey })
        .eq('id', userId);
    }
    return { publicKey, secretKey: existingSecretB64 };
  }

  // 2. Generate a fresh key pair
  const keyPair = nacl.box.keyPair();
  const publicKeyB64 = toBase64(keyPair.publicKey);
  const secretKeyB64 = toBase64(keyPair.secretKey);

  // 3. Persist private key to device-only secure storage
  await SecureStore.setItemAsync(storeKey, secretKeyB64);

  // 4. Upload public key to Supabase profiles
  if (isSupabaseConfigured) {
    await supabase
      .from('profiles')
      .update({ public_key: publicKeyB64 })
      .eq('id', userId);
  }

  return { publicKey: publicKeyB64, secretKey: secretKeyB64 };
}

/**
 * Retrieve the local secret key from secure storage (or null if not found).
 */
export async function getLocalSecretKey(userId: string): Promise<string | null> {
  return await SecureStore.getItemAsync(`${PRIVKEY_PREFIX}${userId}`);
}

// --- Encryption / Decryption ---

export interface EncryptDMResult {
  cipherText: string;   // "e2ee:v1:<nonceB64>:<boxB64>"
  senderPublicKey: string; // base64 public key of sender (stored with message)
}

/**
 * Encrypt a plaintext DM for a specific recipient.
 * @param plainText - The raw message string
 * @param recipientPublicKeyB64 - Recipient's NaCl box public key (base64)
 * @param mySecretKeyB64 - Sender's NaCl box secret key (base64)
 */
export function encryptDM(
  plainText: string,
  recipientPublicKeyB64: string,
  mySecretKeyB64: string
): EncryptDMResult {
  const message = new TextEncoder().encode(plainText);
  const recipientPublicKey = fromBase64(recipientPublicKeyB64);
  const mySecretKey = fromBase64(mySecretKeyB64);

  const nonce = nacl.randomBytes(nacl.box.nonceLength); // 24 bytes
  const encrypted = nacl.box(message, nonce, recipientPublicKey, mySecretKey);

  const myKeyPair = nacl.box.keyPair.fromSecretKey(mySecretKey);
  const myPublicKeyB64 = toBase64(myKeyPair.publicKey);

  return {
    cipherText: `${E2EE_PREFIX}${toBase64(nonce)}:${toBase64(encrypted)}`,
    senderPublicKey: myPublicKeyB64,
  };
}

/**
 * Decrypt an E2EE DM payload.
 * Returns the original plain text, or a fallback string if decryption fails.
 * @param payload - The raw message text from DB (may or may not be E2EE)
 * @param senderPublicKeyB64 - Sender's NaCl box public key (base64), from message row
 * @param mySecretKeyB64 - Recipient's NaCl box secret key (base64), from secure store
 */
export function decryptDM(
  payload: string,
  senderPublicKeyB64: string | null | undefined,
  mySecretKeyB64: string | null | undefined
): string {
  // Backwards compat: plain text messages pass through unchanged
  if (!payload.startsWith(E2EE_PREFIX)) {
    return payload;
  }

  // Edge case: keys not available on this device
  if (!senderPublicKeyB64 || !mySecretKeyB64) {
    return '🔒 Encrypted message (sent before this device key)';
  }

  try {
    const withoutPrefix = payload.slice(E2EE_PREFIX.length);
    const colonIdx = withoutPrefix.indexOf(':');
    if (colonIdx === -1) {
      return '🔒 Encrypted message (malformed)';
    }

    const nonceB64 = withoutPrefix.slice(0, colonIdx);
    const boxB64 = withoutPrefix.slice(colonIdx + 1);

    const nonce = fromBase64(nonceB64);
    const cipherBox = fromBase64(boxB64);
    const senderPublicKey = fromBase64(senderPublicKeyB64);
    const mySecretKey = fromBase64(mySecretKeyB64);

    const decrypted = nacl.box.open(cipherBox, nonce, senderPublicKey, mySecretKey);

    if (!decrypted) {
      return '🔒 Encrypted message (sent before this device key)';
    }

    return new TextDecoder().decode(decrypted);
  } catch {
    return '🔒 Encrypted message (decryption error)';
  }
}
