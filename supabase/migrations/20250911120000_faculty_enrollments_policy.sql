-- Policy: Faculty can view enrollments for their classes
CREATE POLICY "Faculty can view enrollments for their classes"
ON public.enrollments
FOR SELECT
USING (
  class_id IN (
    SELECT id FROM public.classes WHERE faculty_id = auth.uid()
  )
);

-- Enable RLS if not already enabled
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
