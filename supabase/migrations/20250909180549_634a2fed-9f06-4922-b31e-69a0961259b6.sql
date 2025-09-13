-- Completely disable RLS temporarily to stop all recursion
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;

-- Drop EVERY policy that might exist (using different possible names)
DROP POLICY IF EXISTS "faculty_manage_own_classes" ON public.classes;
DROP POLICY IF EXISTS "students_view_enrolled_classes" ON public.classes;
DROP POLICY IF EXISTS "Allow faculty to create new classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty manage own classes" ON public.classes;
DROP POLICY IF EXISTS "Students view enrolled classes" ON public.classes;
DROP POLICY IF EXISTS "Faculty can manage their classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view classes" ON public.classes;

-- Re-enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create ONE simple policy for faculty to manage their classes
CREATE POLICY "simple_faculty_policy" ON public.classes
FOR ALL TO authenticated
USING (faculty_id = auth.uid())
WITH CHECK (faculty_id = auth.uid());