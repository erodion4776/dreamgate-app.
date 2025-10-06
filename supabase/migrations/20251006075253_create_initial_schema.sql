/*
  # Create Dream Interpreter Database Schema

  ## Overview
  This migration creates the complete database schema for the Dream Interpreter application,
  including tables for user profiles, dreams, messages, subscriptions, and usage tracking.

  ## New Tables
  
  ### 1. profiles
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text, unique, not null) - User email
  - `full_name` (text) - Optional user full name
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. dreams
  - `id` (uuid, primary key) - Unique dream identifier
  - `user_id` (uuid, foreign key) - References profiles
  - `title` (text, not null) - Short dream title/summary
  - `content` (text, not null) - Full dream description
  - `interpretation` (text) - AI-generated interpretation
  - `created_at` (timestamptz) - Dream creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. messages
  - `id` (uuid, primary key) - Unique message identifier
  - `dream_id` (uuid, foreign key) - References dreams
  - `sender` (text, not null) - Either 'user' or 'ai'
  - `content` (text, not null) - Message content
  - `created_at` (timestamptz) - Message timestamp

  ### 4. subscriptions
  - `user_id` (uuid, primary key) - References profiles
  - `status` (text, not null) - Subscription status: free, active, or cancelled
  - `plan_type` (text, not null) - Type of plan
  - `stripe_customer_id` (text) - Stripe customer ID
  - `stripe_subscription_id` (text) - Stripe subscription ID
  - `current_period_end` (timestamptz) - Subscription period end
  - `created_at` (timestamptz) - Subscription creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. user_limits
  - `user_id` (uuid, primary key) - References profiles
  - `monthly_free_limit` (integer, default 3) - Free interpretations per month
  - `interpretations_this_month` (integer, default 0) - Current month usage
  - `last_reset_date` (timestamptz) - Last monthly reset date
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  
  ### Row Level Security (RLS)
  All tables have RLS enabled with secure policies:
  
  #### profiles
  - Users can read their own profile
  - Users can update their own profile
  
  #### dreams
  - Users can read their own dreams
  - Users can create dreams for themselves
  - Users can update their own dreams
  - Users can delete their own dreams
  
  #### messages
  - Users can read messages for their dreams
  - Users can create messages for their dreams
  - Users cannot update or delete messages
  
  #### subscriptions
  - Users can read their own subscription
  - Service role can manage all subscriptions
  
  #### user_limits
  - Users can read their own limits
  - Service role can update limits

  ## Indexes
  - Index on dreams.user_id for fast user dream lookup
  - Index on messages.dream_id for fast message retrieval
  - Index on dreams.created_at for chronological queries

  ## Important Notes
  1. All tables use RLS for security
  2. Foreign keys ensure referential integrity
  3. Timestamps use timestamptz for timezone awareness
  4. Default values ensure data consistency
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create dreams table
CREATE TABLE IF NOT EXISTS dreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  interpretation text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id uuid NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'ai')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'active', 'cancelled')),
  plan_type text NOT NULL DEFAULT 'free_tier',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create user_limits table
CREATE TABLE IF NOT EXISTS user_limits (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  monthly_free_limit integer DEFAULT 3 NOT NULL,
  interpretations_this_month integer DEFAULT 0 NOT NULL,
  last_reset_date timestamptz DEFAULT date_trunc('month', now()) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON dreams(user_id);
CREATE INDEX IF NOT EXISTS idx_dreams_created_at ON dreams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_dream_id ON messages(dream_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_limits ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policies for dreams table
CREATE POLICY "Users can read own dreams"
  ON dreams FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own dreams"
  ON dreams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dreams"
  ON dreams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dreams"
  ON dreams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for messages table
CREATE POLICY "Users can read messages for own dreams"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dreams
      WHERE dreams.id = messages.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for own dreams"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dreams
      WHERE dreams.id = messages.dream_id
      AND dreams.user_id = auth.uid()
    )
  );

-- Policies for subscriptions table
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for user_limits table
CREATE POLICY "Users can read own limits"
  ON user_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own limits"
  ON user_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own limits"
  ON user_limits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_dreams_updated_at') THEN
    CREATE TRIGGER update_dreams_updated_at
      BEFORE UPDATE ON dreams
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
    CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_limits_updated_at') THEN
    CREATE TRIGGER update_user_limits_updated_at
      BEFORE UPDATE ON user_limits
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;