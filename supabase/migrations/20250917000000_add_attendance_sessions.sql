-- Update database to support multiple attendance sessions per day
-- Each teacher action (QR, manual, hybrid, face recognition) creates a new session

-- Step 1: Create attendance_sessions table if not exists
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

-- Step 2: Add RLS policies for attendance_sessions
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

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
        SELECT class_id FROM class_enrollments 
        WHERE student_id = auth.uid() AND status = 'active'
    )
);

-- Step 3: Add session_id to attendance table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance' AND column_name = 'session_id') THEN
        ALTER TABLE attendance ADD COLUMN session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Drop old constraint if exists
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS unique_student_class_session_date;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS unique_student_session;

-- Step 5: Create new unique constraint
ALTER TABLE attendance ADD CONSTRAINT unique_student_session 
UNIQUE (student_id, session_id);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_date ON attendance_sessions(class_id, session_date);