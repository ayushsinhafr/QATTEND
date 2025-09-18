import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 Face attendance verification started');
  
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
      console.log('❌ Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.log('❌ JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { class_id, embedding, session_info } = requestBody;
    console.log('📨 Request data:', { class_id, hasEmbedding: !!embedding, session_info });

    // Parse the class_id if it contains the face verification token format
    let actualClassId = class_id;
    if (typeof class_id === 'string' && class_id.includes(':FACE_VERIFICATION')) {
      // Token format: classId:timestamp:FACE_VERIFICATION
      const parts = class_id.split(':');
      if (parts.length === 3 && parts[2] === 'FACE_VERIFICATION') {
        actualClassId = parts[0];
        console.log('🔍 Parsed class_id from token:', actualClassId);
      }
    }

    if (!actualClassId) {
      return new Response(
        JSON.stringify({ error: 'class_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!embedding || !Array.isArray(embedding)) {
      return new Response(
        JSON.stringify({ error: 'Face embedding is required for verification' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Looking for face profile for user:', user.id);
    const { data: faceProfile, error: queryError } = await supabaseClient
      .from('face_profiles')
      .select(`
        id,
        face_profile_embeddings (
          embedding
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (queryError || !faceProfile || !faceProfile.face_profile_embeddings || faceProfile.face_profile_embeddings.length === 0) {
      console.log('❌ No face profile found for user:', user.id, queryError);
      return new Response(
        JSON.stringify({ 
          error: 'No face profile found. Please enroll your face first.',
          code: 'NO_FACE_PROFILE'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Face profile found for user with', faceProfile.face_profile_embeddings.length, 'embeddings');

    // Calculate average embedding from all stored embeddings for comparison
    const storedEmbeddings = faceProfile.face_profile_embeddings.map((item: any) => item.embedding);
    console.log('📊 Processing', storedEmbeddings.length, 'stored embeddings');
    
    let averageEmbedding: number[];
    try {
      const dimension = storedEmbeddings[0].length;
      averageEmbedding = new Array(dimension).fill(0);
      
      // Calculate average embedding
      for (const storedEmb of storedEmbeddings) {
        for (let i = 0; i < dimension; i++) {
          averageEmbedding[i] += storedEmb[i];
        }
      }
      
      for (let i = 0; i < dimension; i++) {
        averageEmbedding[i] /= storedEmbeddings.length;
      }
      
      console.log('✅ Calculated average embedding, length:', averageEmbedding.length);
    } catch (parseError) {
      console.log('❌ Error processing stored embeddings:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid stored face profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
      if (embedding1.length !== embedding2.length) {
        console.log('❌ Embedding length mismatch:', embedding1.length, 'vs', embedding2.length);
        return 0;
      }

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
      }

      const magnitude1 = Math.sqrt(norm1);
      const magnitude2 = Math.sqrt(norm2);

      if (magnitude1 === 0 || magnitude2 === 0) {
        return 0;
      }

      return dotProduct / (magnitude1 * magnitude2);
    }

    const similarity = cosineSimilarity(embedding, averageEmbedding);
    const threshold = 0.45; // TEMPORARY: Lower threshold for debugging

    console.log(`🎯 FACE VERIFICATION DEBUG:`);
    console.log(`   Live embedding length: ${embedding.length}`);
    console.log(`   Live embedding first 5: [${embedding.slice(0, 5).map(x => x.toFixed(4)).join(', ')}]`);
    console.log(`   Stored embedding length: ${averageEmbedding.length}`);
    console.log(`   Stored embedding first 5: [${averageEmbedding.slice(0, 5).map(x => x.toFixed(4)).join(', ')}]`);
    console.log(`   Similarity: ${similarity.toFixed(4)} (${(similarity * 100).toFixed(1)}%)`);
    console.log(`   Threshold: ${threshold.toFixed(4)} (${(threshold * 100).toFixed(1)}%)`);
    console.log(`   Result: ${similarity >= threshold ? '✅ AUTHORIZED' : '❌ REJECTED'}`);

    if (similarity < threshold) {
      console.log('🚫 SECURITY: Face verification FAILED - Unauthorized person!');
      return new Response(
        JSON.stringify({ 
          error: 'FACE VERIFICATION FAILED: You are not authorized for this account',
          code: 'FACE_MISMATCH',
          similarity: similarity,
          threshold: threshold,
          message: `Face similarity ${(similarity * 100).toFixed(1)}% is below required ${(threshold * 100).toFixed(1)}%`
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ FACE VERIFICATION PASSED');

    // Parse the class_id to extract session timestamp (same as regular QR system)
    let sessionTimestamp: string;
    
    if (typeof class_id === 'string' && class_id.includes(':FACE_VERIFICATION')) {
      // Token format: classId:timestamp:FACE_VERIFICATION
      const parts = class_id.split(':');
      if (parts.length === 3) {
        const timestampNum = parseInt(parts[1]);
        sessionTimestamp = new Date(timestampNum).toISOString();
        console.log('🕐 Extracted session timestamp from token:', sessionTimestamp);
      } else {
        sessionTimestamp = new Date().toISOString();
        console.log('🕐 Using current timestamp (token format unexpected):', sessionTimestamp);
      }
    } else {
      sessionTimestamp = new Date().toISOString();
      console.log('🕐 Using current timestamp (no token timestamp):', sessionTimestamp);
    }

    const sessionDate = sessionTimestamp.split('T')[0];
    
    // Check if attendance was already marked for this specific session (same logic as regular QR)
    const { data: existingAttendance } = await supabaseClient
      .from('attendance')
      .select('id, timestamp')
      .eq('student_id', user.id)
      .eq('class_id', actualClassId)
      .eq('session_date', sessionDate)
      .eq('timestamp', sessionTimestamp)  // Use exact timestamp match like regular QR
      .maybeSingle();

    console.log('🔍 Existing attendance check for session:', existingAttendance);

    if (existingAttendance) {
      console.log('ℹ️ Attendance already marked for this face verification session');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Attendance already marked for this face verification session',
          alreadyMarked: true,
          similarity: similarity,
          threshold: threshold,
          sessionTimestamp: sessionTimestamp
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark attendance directly in attendance table (same as regular QR system)
    const attendanceRecord = {
      student_id: user.id,
      class_id: actualClassId,
      status: 'present',
      session_date: sessionDate,
      timestamp: sessionTimestamp,
    };

    console.log('📝 Marking face verification attendance directly:', attendanceRecord);
    
    const { data: attendanceData, error: attendanceError } = await supabaseClient
      .from('attendance')
      .insert(attendanceRecord);

    if (attendanceError) {
      console.log('❌ Failed to mark attendance:', attendanceError);
      
      // Handle specific constraint errors
      if (attendanceError.code === '23505') {
        console.log('ℹ️ Attendance already exists for this session, returning success');
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Attendance already marked for this face verification session',
            alreadyMarked: true,
            similarity: similarity,
            threshold: threshold,
            sessionTimestamp: sessionTimestamp
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to mark attendance',
          details: attendanceError.message,
          code: attendanceError.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎉 SUCCESS: Face verified and attendance marked!');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `VERIFIED! Face recognition attendance marked. Similarity: ${(similarity * 100).toFixed(1)}%`,
        similarity: similarity,
        threshold: threshold,
        sessionDate: sessionDate,
        sessionTimestamp: sessionTimestamp,
        verificationMethod: 'face_verification'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 CRITICAL ERROR in face verification:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during face verification',
        details: errorMessage,
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});