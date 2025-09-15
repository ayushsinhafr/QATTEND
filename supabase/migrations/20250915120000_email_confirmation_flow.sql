-- Create function to handle user registration after email confirmation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_unique_id TEXT;
  user_role public.user_role;
BEGIN
  -- Extract metadata from raw_user_meta_data
  user_name := NEW.raw_user_meta_data->>'name';
  user_unique_id := NEW.raw_user_meta_data->>'unique_id';
  user_role := (NEW.raw_user_meta_data->>'role')::public.user_role;

  -- Only create profile if email is confirmed and metadata exists
  IF NEW.email_confirmed_at IS NOT NULL AND user_name IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, name, unique_id, role)
    VALUES (NEW.id, user_name, user_unique_id, user_role);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires on INSERT and UPDATE (for email confirmation)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;