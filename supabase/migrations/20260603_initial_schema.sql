-- Initial Schema for MoodPass MVP

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Establishments Table (The core tenant)
CREATE TABLE public.establishments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- Used for dynamic routing (e.g. app.moodpass.co/e/pizza-royale)
    phone TEXT,
    currency TEXT DEFAULT 'FCFA' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Categories Table (For Menus)
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Products Table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    client_name TEXT, -- Optional, as we want minimal friction
    table_number TEXT,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Order Items Table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create Policies for RLS
-- (Assuming public access for reading menus, but protected access for everything else)

-- Establishments: Anyone can read
CREATE POLICY "Public profiles are viewable by everyone."
ON public.establishments FOR SELECT
USING ( true );

-- Categories: Anyone can read
CREATE POLICY "Categories are viewable by everyone."
ON public.categories FOR SELECT
USING ( true );

-- Products: Anyone can read
CREATE POLICY "Products are viewable by everyone."
ON public.products FOR SELECT
USING ( true );

-- Orders: Anyone can insert an order
CREATE POLICY "Anyone can create an order."
ON public.orders FOR INSERT
WITH CHECK ( true );

-- Orders: Can only be read by the establishment owner (requires auth context, simplified here)
-- For MVP, we might need a way for the client to read their own order status if they have the ID
CREATE POLICY "Anyone can read an order if they have the ID."
ON public.orders FOR SELECT
USING ( true );

-- Order Items: Anyone can insert
CREATE POLICY "Anyone can create order items."
ON public.order_items FOR INSERT
WITH CHECK ( true );

-- Order Items: Anyone can read their own (simplified)
CREATE POLICY "Anyone can read order items."
ON public.order_items FOR SELECT
USING ( true );
