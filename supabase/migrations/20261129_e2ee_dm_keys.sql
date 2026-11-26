-- E2EE DM Keys Migration
-- Adds public_key to profiles and E2EE metadata columns to messages.
-- Only 1-on-1 DMs are encrypted; community group chats remain plain (TLS + RLS).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_key TEXT;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sender_public_key TEXT;

COMMENT ON COLUMN public.profiles.public_key IS 'NaCl box public key (base64). Private key never leaves the device.';
COMMENT ON COLUMN public.messages.is_encrypted IS 'TRUE when message text is E2EE-encrypted (DMs only). Community messages are always FALSE.';
COMMENT ON COLUMN public.messages.sender_public_key IS 'Sender NaCl box public key (base64) at time of encryption, used by recipient for decryption.';
