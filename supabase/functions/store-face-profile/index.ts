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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { embeddings } = await req.json();

    if (!embeddings || !Array.isArray(embeddings) || embeddings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Embeddings array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate average embedding
    const dimension = embeddings[0].length;
    const averaged = new Array(dimension).fill(0);
    
    for (const embedding of embeddings) {
      for (let i = 0; i < dimension; i++) {
        averaged[i] += embedding[i];
      }
    }
    
    for (let i = 0; i < dimension; i++) {
      averaged[i] /= embeddings.length;
    }

    // Delete existing profile and embeddings
    const { data: existingProfile } = await supabaseClient
      .from('face_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      await supabaseClient.from('face_profile_embeddings').delete().eq('face_profile_id', existingProfile.id);
      await supabaseClient.from('face_profiles').delete().eq('user_id', user.id);
    }

    // Insert new face profile
    const { data: newProfile, error: profileError } = await supabaseClient
      .from('face_profiles')
      .insert({
        user_id: user.id
      })
      .select()
      .single();

    if (profileError || !newProfile) {
      return new Response(
        JSON.stringify({ error: 'Failed to create face profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store individual embeddings
    const embeddingInserts = embeddings.map((embedding: number[]) => ({
      face_profile_id: newProfile.id,
      embedding: embedding
    }));

    const { error: embeddingsError } = await supabaseClient
      .from('face_profile_embeddings')
      .insert(embeddingInserts);

    if (embeddingsError) {
      // Clean up profile if embeddings failed
      await supabaseClient.from('face_profiles').delete().eq('id', newProfile.id);
      return new Response(
        JSON.stringify({ error: 'Failed to store face embeddings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Face profile created successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to process face profile' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});