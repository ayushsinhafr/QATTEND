-- UPDATE DATABASE FOR MULTIPLE SESSIONS PER DAY
-- This allows teachers to run multiple attendance methods (QR, manual, hybrid, face) in separate sessions

-- Step 1: Create attendance_sessions table
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    session_method VARCHAR(20) NOT NULL CHECK (session_method IN ('qr', 'manual', 'hybrid', 'face_recognition')),
    session_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_end_time TIMESTAMPTZ,
    session_status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'closed')),
    qr_token TEXT, -- For QR sessions, store the token used
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add RLS policies for attendance_sessions
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own class sessions"
ON attendance_sessions FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Students can view active sessions for their classes"
ON attendance_sessions FOR SELECT
USING (
    session_status = 'active' AND
    class_id IN (
        SELECT class_id FROM class_enrollments 
        WHERE student_id = auth.uid() AND status = 'active'
    )
);

-- Step 3: Add session_id to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE;

-- Step 4: Drop the old unique constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS unique_student_class_session_date;

-- Step 5: Create new unique constraint that includes session_id
ALTER TABLE attendance ADD CONSTRAINT unique_student_session 
UNIQUE (student_id, session_id);

-- Step 6: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_date ON attendance_sessions(class_id, session_date);

-- Step 7: Migrate existing attendance records (create default sessions for them)
-- First, create default sessions for existing attendance records
INSERT INTO attendance_sessions (id, class_id, teacher_id, session_date, session_method, session_status, session_start_time)
SELECT DISTINCT 
    gen_random_uuid() as id,
    a.class_id,
    c.teacher_id,
    a.session_date,
    'manual' as session_method, -- Assume existing records are manual
    'closed' as session_status,
    a.session_date::date + time '09:00:00' as session_start_time
FROM attendance a
JOIN classes c ON a.class_id = c.id
WHERE a.session_id IS NULL
ON CONFLICT DO NOTHING;

-- Update existing attendance records to reference these sessions
UPDATE attendance 
SET session_id = (
    SELECT s.id 
    FROM attendance_sessions s 
    WHERE s.class_id = attendance.class_id 
    AND s.session_date = attendance.session_date 
    AND s.session_method = 'manual'
    LIMIT 1
)
WHERE session_id IS NULL;

-- Step 8: Make session_id required (after migration)
ALTER TABLE attendance ALTER COLUMN session_id SET NOT NULL;

-- Step 9: Create function to automatically close old sessions
CREATE OR REPLACE FUNCTION close_old_sessions()
RETURNS trigger AS $$
BEGIN
    -- Auto-close sessions older than 4 hours
    UPDATE attendance_sessions 
    SET session_status = 'closed', 
        session_end_time = NOW(),
        updated_at = NOW()
    WHERE session_status = 'active' 
    AND session_start_time < NOW() - INTERVAL '4 hours';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-close old sessions
DROP TRIGGER IF EXISTS trigger_close_old_sessions ON attendance_sessions;
CREATE TRIGGER trigger_close_old_sessions
    AFTER INSERT ON attendance_sessions
    FOR EACH ROW EXECUTE FUNCTION close_old_sessions();

-- Step 10: Verify the new structure
SELECT 'attendance_sessions table created' as status;
SELECT 'attendance table updated with session_id' as status;
SELECT 'Constraints and policies applied' as status;

-- Show current sessions
SELECT 
    s.id,
    s.session_method,
    s.session_date,
    s.session_status,
    c.name as class_name,
    COUNT(a.id) as attendance_count
FROM attendance_sessions s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN attendance a ON s.id = a.session_id
GROUP BY s.id, s.session_method, s.session_date, s.session_status, c.name
ORDER BY s.session_date DESC, s.session_start_time DESC;