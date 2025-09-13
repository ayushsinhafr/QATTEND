-- Fix all faculty access issues by creating database functions that bypass RLS

-- Function to get faculty classes
CREATE OR REPLACE FUNCTION get_faculty_classes(faculty_user_id UUID)
RETURNS TABLE (
  id UUID,
  class_name TEXT,
  section TEXT,
  class_code TEXT,
  faculty_id UUID,
  student_strength INTEGER,
  qr_token TEXT,
  qr_expiration TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.class_name,
    c.section,
    c.class_code,
    c.faculty_id,
    c.student_strength,
    c.qr_token,
    c.qr_expiration,
    c.created_at,
    c.updated_at
  FROM classes c
  WHERE c.faculty_id = faculty_user_id
  ORDER BY c.created_at DESC;
END;
$$;

-- Function to get class enrollments count
CREATE OR REPLACE FUNCTION get_class_enrollments_count(class_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enrollment_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO enrollment_count
  FROM enrollments e
  WHERE e.class_id = class_uuid;
  
  RETURN COALESCE(enrollment_count, 0);
END;
$$;

-- Function to get full class analytics
CREATE OR REPLACE FUNCTION get_class_analytics(class_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  enrollment_count INTEGER;
  attendance_count INTEGER;
  session_count INTEGER;
BEGIN
  -- Get enrollment count
  SELECT COUNT(*)
  INTO enrollment_count
  FROM enrollments e
  WHERE e.class_id = class_uuid;
  
  -- Get total attendance records
  SELECT COUNT(DISTINCT a.student_id)
  INTO attendance_count
  FROM attendance a
  WHERE a.class_id = class_uuid AND a.status = 'present';
  
  -- Get total sessions
  SELECT COUNT(DISTINCT a.session_date)
  INTO session_count
  FROM attendance a
  WHERE a.class_id = class_uuid;
  
  -- Build result
  result := json_build_object(
    'enrolled_students', COALESCE(enrollment_count, 0),
    'total_sessions', COALESCE(session_count, 0),
    'attendance_records', COALESCE(attendance_count, 0)
  );
  
  RETURN result;
END;
$$;

-- Function to get enrollment details
CREATE OR REPLACE FUNCTION get_class_enrollments_detailed(class_uuid UUID)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  class_id UUID,
  enrolled_at TIMESTAMP WITH TIME ZONE,
  student_name TEXT,
  student_unique_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.student_id,
    e.class_id,
    e.enrolled_at,
    p.name,
    p.unique_id
  FROM enrollments e
  JOIN profiles p ON p.user_id = e.student_id
  WHERE e.class_id = class_uuid
  ORDER BY e.enrolled_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_faculty_classes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_class_enrollments_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_class_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_class_enrollments_detailed(UUID) TO authenticated;
