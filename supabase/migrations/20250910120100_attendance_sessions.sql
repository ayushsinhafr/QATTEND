-- Create attendance_sessions table to track when faculty starts a QR session
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on attendance_sessions
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance_sessions
CREATE POLICY "Faculty can manage their attendance sessions" 
ON public.attendance_sessions 
FOR ALL 
USING (faculty_id = auth.uid());

CREATE POLICY "Students can view active sessions for enrolled classes" 
ON public.attendance_sessions 
FOR SELECT 
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.class_id = attendance_sessions.class_id 
    AND enrollments.student_id = auth.uid()
  )
);

-- Add session_id to attendance table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance' AND column_name = 'session_id') THEN
        ALTER TABLE public.attendance ADD COLUMN session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add marked_at timestamp to track exact attendance time
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance' AND column_name = 'marked_at') THEN
        ALTER TABLE public.attendance ADD COLUMN marked_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Function to update session counts when attendance is marked
CREATE OR REPLACE FUNCTION public.update_session_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session counts when attendance is marked
  IF TG_OP = 'INSERT' AND NEW.session_id IS NOT NULL THEN
    UPDATE public.attendance_sessions 
    SET 
      present_count = (SELECT COUNT(*) FROM public.attendance WHERE session_id = NEW.session_id AND status = 'present'),
      absent_count = (SELECT COUNT(*) FROM public.attendance WHERE session_id = NEW.session_id AND status = 'absent'),
      updated_at = now()
    WHERE id = NEW.session_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update session counts
DROP TRIGGER IF EXISTS update_session_counts_trigger ON public.attendance;
CREATE TRIGGER update_session_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_counts();

-- Function to mark absent students when session ends
CREATE OR REPLACE FUNCTION public.mark_absent_students_for_session(session_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  marked_count INTEGER := 0;
  session_record RECORD;
BEGIN
  -- Get session details
  SELECT * INTO session_record FROM public.attendance_sessions WHERE id = session_uuid;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Mark absent students who didn't mark attendance
  INSERT INTO public.attendance (student_id, class_id, session_id, status, session_date, marked_at)
  SELECT 
    e.student_id,
    session_record.class_id,
    session_uuid,
    'absent',
    session_record.session_date,
    now()
  FROM public.enrollments e
  WHERE e.class_id = session_record.class_id
  AND NOT EXISTS (
    SELECT 1 FROM public.attendance a 
    WHERE a.student_id = e.student_id 
    AND a.session_id = session_uuid
  );
  
  GET DIAGNOSTICS marked_count = ROW_COUNT;
  
  -- Update session as inactive
  UPDATE public.attendance_sessions 
  SET 
    is_active = false,
    updated_at = now()
  WHERE id = session_uuid;
  
  RETURN marked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
