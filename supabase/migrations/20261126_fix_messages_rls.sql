-- ==============================================================================
-- ASHTAVINAYAK EMPIRE - MIGRATION 20261126
-- Fix Messages RLS Policy for Reactions and Read Receipts
-- ==============================================================================

-- Drop existing update policy if any
DROP POLICY IF EXISTS "Allow authenticated update messages" ON public.messages;

-- Allow authenticated users to update messages for emoji reactions and read status
CREATE POLICY "Allow authenticated update messages" ON public.messages
FOR UPDATE TO authenticated
USING (
    room_type = 'community' 
    OR auth.uid() = sender_id 
    OR auth.uid() = recipient_id
)
WITH CHECK (
    room_type = 'community' 
    OR auth.uid() = sender_id 
    OR auth.uid() = recipient_id
);
