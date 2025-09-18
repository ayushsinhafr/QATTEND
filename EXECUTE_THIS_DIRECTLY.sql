-- Step 1: Drop existing tables if they exist
DROP TABLE IF EXISTS face_profile_embeddings CASCADE;
DROP TABLE IF EXISTS face_profiles CASCADE;

-- Step 2: Create face_profiles table
CREATE TABLE face_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Step 3: Create face_profile_embeddings table
CREATE TABLE face_profile_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    face_profile_id UUID NOT NULL REFERENCES face_profiles(id) ON DELETE CASCADE,
    embedding FLOAT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 4: Enable RLS on both tables
ALTER TABLE face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_profile_embeddings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for face_profiles
CREATE POLICY "Users can view their own face profile" ON face_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own face profile" ON face_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own face profile" ON face_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own face profile" ON face_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Create RLS policies for face_profile_embeddings
CREATE POLICY "Users can view their own face embeddings" ON face_profile_embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM face_profiles 
            WHERE face_profiles.id = face_profile_embeddings.face_profile_id 
            AND face_profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own face embeddings" ON face_profile_embeddings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM face_profiles 
            WHERE face_profiles.id = face_profile_embeddings.face_profile_id 
            AND face_profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own face embeddings" ON face_profile_embeddings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM face_profiles 
            WHERE face_profiles.id = face_profile_embeddings.face_profile_id 
            AND face_profiles.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own face embeddings" ON face_profile_embeddings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM face_profiles 
            WHERE face_profiles.id = face_profile_embeddings.face_profile_id 
            AND face_profiles.user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_face_profiles_user_id ON face_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_face_profile_embeddings_face_profile_id ON face_profile_embeddings(face_profile_id);