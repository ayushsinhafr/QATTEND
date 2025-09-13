-- The 'user' table appears to be unused in the application
-- The app uses 'profiles' table instead, so let's remove the unused 'user' table
DROP TABLE IF EXISTS public.user CASCADE;