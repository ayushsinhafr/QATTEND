-- Add UPDATE policy for attendance table to support upsert operations
-- This is needed because upsert can perform both INSERT and UPDATE operations

CREATE POLICY "Students can update their own attendance" 
ON public.attendance 
FOR UPDATE 
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Add UPDATE policy for faculty to manage attendance in their classes
CREATE POLICY "Faculty can update attendance for their classes" 
ON public.attendance 
FOR UPDATE 
USING (
  class_id IN (
    SELECT id FROM public.classes WHERE faculty_id = auth.uid()
  )
)
WITH CHECK (
  class_id IN (
    SELECT id FROM public.classes WHERE faculty_id = auth.uid()
  )
);
