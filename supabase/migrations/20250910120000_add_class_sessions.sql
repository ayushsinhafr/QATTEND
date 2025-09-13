-- Create class_sessions table to track when faculty conducts classes
CREATE TABLE public.class_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  qr_token TEXT,
  qr_expiration TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  total_enrolled INTEGER DEFAULT 0,
  present_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one session per class per day
  UNIQUE(class_id, session_date)
);

-- Enable RLS on class_sessions
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for class_sessions
CREATE POLICY "Faculty can manage their class sessions" 
ON public.class_sessions 
FOR ALL 
USING (faculty_id = auth.uid());

CREATE POLICY "Students can view active class sessions for enrolled classes" 
ON public.class_sessions 
FOR SELECT 
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.class_id = class_sessions.class_id 
    AND enrollments.student_id = auth.uid()
  )
);

-- Add session_id to attendance table to link attendance to specific sessions
ALTER TABLE public.attendance ADD COLUMN session_id UUID REFERENCES public.class_sessions(id) ON DELETE CASCADE;

-- Function to automatically mark absent students after QR expires
CREATE OR REPLACE FUNCTION public.mark_absent_students()
RETURNS TRIGGER AS $$
BEGIN
  -- When a session becomes inactive (QR expires), mark absent students
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Insert absent records for students who didn't mark attendance
    INSERT INTO public.attendance (student_id, class_id, session_id, status, session_date)
    SELECT 
      e.student_id,
      NEW.class_id,
      NEW.id,
      'absent',
      NEW.session_date
    FROM public.enrollments e
    WHERE e.class_id = NEW.class_id
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance a 
      WHERE a.student_id = e.student_id 
      AND a.class_id = NEW.class_id 
      AND a.session_date = NEW.session_date
    );
    
    -- Update session counts
    NEW.total_enrolled = (SELECT COUNT(*) FROM public.enrollments WHERE class_id = NEW.class_id);
    NEW.present_count = (SELECT COUNT(*) FROM public.attendance WHERE session_id = NEW.id AND status = 'present');
    NEW.absent_count = (SELECT COUNT(*) FROM public.attendance WHERE session_id = NEW.id AND status = 'absent');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-mark absent students
CREATE TRIGGER auto_mark_absent_students
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_absent_students();

-- Function to update session counts when attendance is marked
CREATE OR REPLACE FUNCTION public.update_session_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session counts when attendance is marked
  IF TG_OP = 'INSERT' AND NEW.session_id IS NOT NULL THEN
    UPDATE public.class_sessions 
    SET 
      present_count = (SELECT COUNT(*) FROM public.attendance WHERE session_id = NEW.session_id AND status = 'present'),
      absent_count = (SELECT COUNT(*) FROM public.attendance WHERE session_id = NEW.session_id AND status = 'absent')
    WHERE id = NEW.session_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update session counts
CREATE TRIGGER update_session_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_counts();
