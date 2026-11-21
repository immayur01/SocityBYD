-- ====================================================================
-- ASHTAVINAYAK EMPIRE - PRODUCTION DATABASE SCHEMA & RLS POLICIES
-- Target: Supabase (PostgreSQL 15+)
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES (Society Residents & Admins)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    wing TEXT NOT NULL CHECK (wing IN ('Wing A', 'Wing B', 'Wing C', 'Wing D', 'Wing E', 'Wing F', 'Wing G', 'Wing H', 'Wing I', 'Wing J', 'Wing K', 'Wing L')),
    flat_number TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'committee', 'admin', 'security')),
    bio TEXT DEFAULT 'Proud resident of Ashtavinayak Empire',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 2. 48-HOUR EXPIRING POSTS & FEED
-- ==========================================
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tag TEXT NOT NULL CHECK (tag IN ('Announcement', 'Photo/Video Post', 'Event')),
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', NULL)),
    likes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours') NOT NULL
);

CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 3. FOOD CORNER (Home-Cook Marketplace)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.food_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chef_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    dish_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    diet_type TEXT NOT NULL CHECK (diet_type IN ('Pure Veg', 'Non-Veg')),
    timing TEXT NOT NULL, -- e.g., 'Ready by 7:30 PM (Dinner)'
    portions_left INT NOT NULL DEFAULT 1 CHECK (portions_left >= 0),
    image_url TEXT,
    rating NUMERIC(2, 1) DEFAULT 4.9,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.food_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES public.food_listings(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total_amount NUMERIC(10, 2) NOT NULL,
    delivery_flat TEXT NOT NULL,
    delivery_note TEXT,
    payment_method TEXT NOT NULL DEFAULT 'Pay on Delivery',
    order_status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (order_status IN ('Pending', 'Confirmed', 'Preparing', 'Delivered', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- 4. COMPLAINTS HUB (Dual-Mode: Direct to Admin vs Public Community)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL CHECK (visibility IN ('admin', 'public')),
    category TEXT NOT NULL CHECK (category IN ('Lift & Electrical', 'Water & Plumbing', 'Cleaning & Garbage', 'Parking & Security', 'Other')),
    urgency TEXT NOT NULL DEFAULT 'Normal' CHECK (urgency IN ('Normal', 'High', 'Urgent')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    media_url TEXT,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Assigned', 'Resolved')),
    admin_note TEXT,
    upvotes_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.complaint_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(complaint_id, user_id)
);

-- ==========================================
-- 5. MESSAGES & CHAT (Community & 1-on-1 DM)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type TEXT NOT NULL CHECK (room_type IN ('community', 'dm')),
    room_id TEXT NOT NULL DEFAULT 'community', -- 'community' or combination of resident IDs for DM
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    media_url TEXT,
    reactions JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==========================================
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON public.posts(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_active ON public.food_listings(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_visibility ON public.complaints(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_room ON public.messages(room_type, room_id, created_at ASC);

-- ==========================================
-- ATOMIC STORED PROCEDURES
-- ==========================================
-- Atomically decrement food portions when placing an order
CREATE OR REPLACE FUNCTION public.place_food_order(
    p_listing_id UUID,
    p_resident_id UUID,
    p_quantity INT,
    p_total_amount NUMERIC,
    p_delivery_flat TEXT,
    p_delivery_note TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_portions_left INT;
    v_order_id UUID;
BEGIN
    -- Lock row for update
    SELECT portions_left INTO v_portions_left
    FROM public.food_listings
    WHERE id = p_listing_id
    FOR UPDATE;

    IF v_portions_left IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF v_portions_left < p_quantity THEN
        RAISE EXCEPTION 'Only % portions remaining', v_portions_left;
    END IF;

    -- Decrement portions
    UPDATE public.food_listings
    SET portions_left = portions_left - p_quantity,
        is_active = CASE WHEN (portions_left - p_quantity) > 0 THEN true ELSE false END
    WHERE id = p_listing_id;

    -- Create order record
    INSERT INTO public.food_orders (
        listing_id,
        resident_id,
        quantity,
        total_amount,
        delivery_flat,
        delivery_note,
        payment_method,
        order_status
    )
    VALUES (
        p_listing_id,
        p_resident_id,
        p_quantity,
        p_total_amount,
        p_delivery_flat,
        p_delivery_note,
        'Pay on Delivery',
        'Confirmed'
    )
    RETURNING id INTO v_order_id;

    RETURN v_order_id;
END;
$$;

-- Atomically toggle complaint upvotes
CREATE OR REPLACE FUNCTION public.toggle_complaint_upvote(
    p_complaint_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.complaint_upvotes
        WHERE complaint_id = p_complaint_id AND user_id = p_user_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM public.complaint_upvotes
        WHERE complaint_id = p_complaint_id AND user_id = p_user_id;

        UPDATE public.complaints
        SET upvotes_count = GREATEST(0, upvotes_count - 1)
        WHERE id = p_complaint_id;

        RETURN false;
    ELSE
        INSERT INTO public.complaint_upvotes (complaint_id, user_id)
        VALUES (p_complaint_id, p_user_id);

        UPDATE public.complaints
        SET upvotes_count = upvotes_count + 1
        WHERE id = p_complaint_id;

        RETURN true;
    END IF;
END;
$$;

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read resident directory; only owner can update
CREATE POLICY "Allow public read of profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow individual update of profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Allow individual insert of profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Posts: All residents can read; authenticated residents can insert; author can delete
CREATE POLICY "Allow authenticated read posts" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow author delete posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Post Likes
CREATE POLICY "Allow read post likes" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert own like" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow delete own like" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Post Comments
CREATE POLICY "Allow read post comments" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert own comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Food Listings
CREATE POLICY "Allow read active food listings" ON public.food_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow chef insert food listings" ON public.food_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = chef_id);
CREATE POLICY "Allow chef update food listings" ON public.food_listings FOR UPDATE TO authenticated USING (auth.uid() = chef_id);

-- Food Orders
CREATE POLICY "Allow resident and chef view orders" ON public.food_orders FOR SELECT TO authenticated
USING (
    auth.uid() = resident_id 
    OR auth.uid() IN (SELECT chef_id FROM public.food_listings WHERE id = listing_id)
);
CREATE POLICY "Allow resident insert order" ON public.food_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = resident_id);

-- Complaints
CREATE POLICY "Allow read complaints" ON public.complaints FOR SELECT TO authenticated
USING (
    visibility = 'public' 
    OR auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'committee'))
);
CREATE POLICY "Allow insert complaint" ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow author or admin update complaint" ON public.complaints FOR UPDATE TO authenticated
USING (
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'committee'))
);

-- Complaint Upvotes
CREATE POLICY "Allow read complaint upvotes" ON public.complaint_upvotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow toggle own complaint upvotes" ON public.complaint_upvotes FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Messages
CREATE POLICY "Allow read messages" ON public.messages FOR SELECT TO authenticated
USING (
    room_type = 'community' 
    OR auth.uid() = sender_id 
    OR auth.uid() = recipient_id
);
CREATE POLICY "Allow insert message" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
