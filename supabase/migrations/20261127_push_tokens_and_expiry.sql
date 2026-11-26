-- ==============================================================================
-- ASHTAVINAYAK EMPIRE - MIGRATION 20261126
-- Push Notification Tokens & 48-Hour Post Cleanup Function
-- ==============================================================================

-- 1. Add Expo Push Token column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- 2. Create index on posts(expires_at) for performant 48h active feed filtering & cleanup
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON public.posts (expires_at);

-- 3. Cleanup function for automated or manual deletion of expired posts
CREATE OR REPLACE FUNCTION public.cleanup_expired_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.posts
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant execution permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.cleanup_expired_posts() TO authenticated, service_role;
