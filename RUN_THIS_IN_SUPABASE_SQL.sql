-- DIRECT SQL TO FIX SESSIONS - Run this in Supabase SQL Editor

-- 1. Create attendance_sessions table
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    session_method VARCHAR(20) NOT NULL CHECK (session_method IN ('qr', 'manual', 'hybrid', 'face_recognition')),
    session_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_end_time TIMESTAMPTZ,
    session_status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'closed')),
    qr_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
DROP POLICY IF EXISTS "Teachers can manage their own class sessions" ON attendance_sessions;
CREATE POLICY "Teachers can manage their own class sessions"
ON attendance_sessions FOR ALL
USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view active sessions for their classes" ON attendance_sessions;
CREATE POLICY "Students can view active sessions for their classes"
ON attendance_sessions FOR SELECT
USING (
    session_status = 'active' AND
    class_id IN (
        SELECT class_id FROM enrollments 
        WHERE student_id = auth.uid()
    )
);

-- 4. Add session_id to attendance if not exists
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE;

-- 5. Drop old constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS unique_student_class_session_date;

-- 6. Add new constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS unique_student_session;
ALTER TABLE attendance ADD CONSTRAINT unique_student_session 
UNIQUE (student_id, session_id);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_date ON attendance_sessions(class_id, session_date);

-- 8. Show result
SELECT 'Sessions table created successfully!' as message;