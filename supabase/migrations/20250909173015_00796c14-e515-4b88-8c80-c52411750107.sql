-- Create security definer function to check if user is faculty
CREATE OR REPLACE FUNCTION public.is_user_faculty()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'faculty'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Faculty can create classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can update their own classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can delete their own classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can view their own classes" ON public.classes;

-- Recreate policies using the security definer function
CREATE POLICY "Faculty can create classes" 
ON public.classes 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_user_faculty() AND faculty_id = auth.uid());

CREATE POLICY "Faculty can update their own classes" 
ON public.classes 
FOR UPDATE 
TO authenticated
USING (faculty_id = auth.uid() AND public.is_user_faculty());

CREATE POLICY "Faculty can delete their own classes" 
ON public.classes 
FOR DELETE 
TO authenticated
USING (faculty_id = auth.uid() AND public.is_user_faculty());

CREATE POLICY "Faculty can view their own classes" 
ON public.classes 
FOR SELECT 
TO authenticated
USING (faculty_id = auth.uid() AND public.is_user_faculty());