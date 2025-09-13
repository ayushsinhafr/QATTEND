-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.generate_class_code(class_name TEXT, section TEXT)
RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 1;
BEGIN
  -- Create base code from class name and section
  base_code := UPPER(LEFT(REPLACE(class_name, ' ', ''), 6)) || '-' || UPPER(section);
  final_code := base_code;
  
  -- Check if code exists and increment if needed
  WHILE EXISTS (SELECT 1 FROM public.classes WHERE class_code = final_code) LOOP
    final_code := base_code || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix the handle_new_user function search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, unique_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'unique_id', ''),
    CAST(COALESCE(NEW.raw_user_meta_data->>'role', 'student') AS user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;