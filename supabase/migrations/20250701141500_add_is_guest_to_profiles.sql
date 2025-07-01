-- Add the is_guest column to the profiles table to differentiate between registered and guest users.
-- We are setting a default value of 'false' and making the column NOT NULL.
-- This ensures that all existing users are correctly marked as registered users.
ALTER TABLE public.profiles
ADD COLUMN is_guest BOOLEAN DEFAULT false NOT NULL;
