-- Create a function to get enrollments for a class (bypasses RLS)
CREATE OR REPLACE FUNCTION get_class_enrollments(p_class_id UUID)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  class_id UUID,
  enrolled_at TIMESTAMPTZ,
  student_name TEXT,
  student_unique_id TEXT
)
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT 
    e.id,
    e.student_id,
    e.class_id,
    e.enrolled_at,
    p.name as student_name,
    p.unique_id as student_unique_id
  FROM enrollments e
  LEFT JOIN profiles p ON p.user_id = e.student_id
  WHERE e.class_id = p_class_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_class_enrollments(UUID) TO authenticated;
