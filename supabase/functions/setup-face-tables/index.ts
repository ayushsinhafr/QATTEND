import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for admin operations
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    console.log('🚀 Creating face recognition tables...');

    // Create face_profiles table
    const { data: profilesResult, error: profilesError } = await supabaseClient
      .rpc('execute_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS public.face_profiles (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
              embedding TEXT NOT NULL,
              embedding_count INTEGER NOT NULL DEFAULT 1,
              quality_score DECIMAL(4,3) DEFAULT 0.800,
              similarity_threshold DECIMAL(4,3) DEFAULT 0.450,
              device_fingerprint JSONB,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              UNIQUE(user_id)
          );
        `
      });

    if (profilesError) {
      console.error('Error creating face_profiles table:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to create face_profiles table', details: profilesError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create face_profile_embeddings table
    const { data: embeddingsResult, error: embeddingsError } = await supabaseClient
      .rpc('execute_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS public.face_profile_embeddings (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
              embedding TEXT NOT NULL,
              quality_score DECIMAL(4,3) DEFAULT 0.800,
              created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      });

    if (embeddingsError) {
      console.error('Error creating face_profile_embeddings table:', embeddingsError);
    }

    // Enable RLS
    const { data: rlsResult, error: rlsError } = await supabaseClient
      .rpc('execute_sql', {
        query: `
          ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.face_profile_embeddings ENABLE ROW LEVEL SECURITY;
          
          DROP POLICY IF EXISTS "Users can manage their own face profile" ON public.face_profiles;
          CREATE POLICY "Users can manage their own face profile" ON public.face_profiles
              FOR ALL USING (auth.uid() = user_id);
              
          DROP POLICY IF EXISTS "Users can manage their own face embeddings" ON public.face_profile_embeddings;
          CREATE POLICY "Users can manage their own face embeddings" ON public.face_profile_embeddings
              FOR ALL USING (auth.uid() = user_id);
        `
      });

    if (rlsError) {
      console.error('Error setting up RLS:', rlsError);
    }

    console.log('✅ Face recognition tables created successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Face recognition tables created successfully',
        tables: ['face_profiles', 'face_profile_embeddings']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error setting up tables:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to setup face recognition tables',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});