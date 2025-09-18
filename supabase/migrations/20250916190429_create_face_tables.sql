-- Drop tables if they exist (to start fresh)
DROP TABLE IF EXISTS face_profile_embeddings CASCADE;
DROP TABLE IF EXISTS face_profiles CASCADE;

-- Create face_profiles table
CREATE TABLE face_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Create face_profile_embeddings table
CREATE TABLE face_profile_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    face_profile_id UUID NOT NULL REFERENCES face_profiles(id) ON DELETE CASCADE,
    embedding FLOAT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_profile_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies for face_profiles
CREATE POLICY "Users can view their own face profile" ON face_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own face profile" ON face_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own face profile" ON face_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own face profile" ON face_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for face_profile_embeddings
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
CREATE INDEX idx_face_profiles_user_id ON face_profiles(user_id);
CREATE INDEX idx_face_profile_embeddings_face_profile_id ON face_profile_embeddings(face_profile_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for face_profiles updated_at
CREATE TRIGGER update_face_profiles_updated_at 
    BEFORE UPDATE ON face_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
