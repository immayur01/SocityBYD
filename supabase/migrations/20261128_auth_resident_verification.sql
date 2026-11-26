-- ==============================================================================
-- ASHTAVINAYAK EMPIRE - MIGRATION 20261128
-- Resident Type and Verification Status for Phase 1 & Phase 2 Admin Approval
-- ==============================================================================

-- 1. Add resident_type and verification_status columns to public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS resident_type TEXT DEFAULT 'owner' CHECK (resident_type IN ('owner', 'tenant'));

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'approved' CHECK (verification_status IN ('pending', 'approved', 'rejected'));

-- 2. Create index for fast admin queries on pending verifications
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles (verification_status);
