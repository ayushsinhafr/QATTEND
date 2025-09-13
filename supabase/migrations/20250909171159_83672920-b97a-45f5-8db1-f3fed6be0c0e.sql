-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name TEXT NOT NULL,
  section TEXT NOT NULL,
  class_code TEXT NOT NULL UNIQUE,
  faculty_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  student_strength INTEGER DEFAULT 0,
  qr_token TEXT,
  qr_expiration TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- RLS policies for classes
CREATE POLICY "Faculty can view their own classes" 
ON public.classes 
FOR SELECT 
USING (faculty_id = auth.uid());

CREATE POLICY "Faculty can create classes" 
ON public.classes 
FOR INSERT 
WITH CHECK (faculty_id = auth.uid());

CREATE POLICY "Faculty can update their own classes" 
ON public.classes 
FOR UPDATE 
USING (faculty_id = auth.uid());

CREATE POLICY "Faculty can delete their own classes" 
ON public.classes 
FOR DELETE 
USING (faculty_id = auth.uid());

-- Students can view classes they're enrolled in (we'll add this after enrollments table)

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- Enable RLS on enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- RLS policies for enrollments
CREATE POLICY "Students can view their own enrollments" 
ON public.enrollments 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can enroll in classes" 
ON public.enrollments 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Faculty can view enrollments for their classes" 
ON public.enrollments 
FOR SELECT 
USING (
  class_id IN (
    SELECT id FROM public.classes WHERE faculty_id = auth.uid()
  )
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Ensure one attendance record per student per class per day
  UNIQUE(student_id, class_id, session_date)
);

-- Enable RLS on attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance
CREATE POLICY "Students can view their own attendance" 
ON public.attendance 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Students can mark their own attendance" 
ON public.attendance 
FOR INSERT 
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Faculty can view attendance for their classes" 
ON public.attendance 
FOR SELECT 
USING (
  class_id IN (
    SELECT id FROM public.classes WHERE faculty_id = auth.uid()
  )
);

-- Now add student view policy for classes (after enrollments table exists)
CREATE POLICY "Students can view enrolled classes" 
ON public.classes 
FOR SELECT 
USING (
  id IN (
    SELECT class_id FROM public.enrollments WHERE student_id = auth.uid()
  )
);

-- Create function to generate unique class codes
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update class timestamps
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live attendance updates
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
ALTER TABLE public.classes REPLICA IDENTITY FULL;
ALTER TABLE public.enrollments REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;