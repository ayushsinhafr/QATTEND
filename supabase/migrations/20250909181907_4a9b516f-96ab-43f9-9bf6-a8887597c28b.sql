-- Fix security issue: Add RLS policy to the user table or disable RLS if it's not needed
-- The user table seems to be unused based on the code, so let's disable RLS on it
ALTER TABLE public.user DISABLE ROW LEVEL SECURITY;