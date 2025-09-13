import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    console.log(`Verifying QR token: ${token} for user: ${user.id}`)

    // Find the class with this token and check if it's still valid
    const { data: classData, error: classError } = await supabaseClient
      .from('classes')
      .select('id, qr_expiration')
      .eq('qr_token', token)
      .single()

    if (classError || !classData) {
      console.log('Invalid token or class not found:', classError)
      return new Response(
        JSON.stringify({ error: 'Invalid QR code' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // Check if token is still valid
    const now = new Date()
    const expiration = new Date(classData.qr_expiration || 0)
    
    if (now > expiration) {
      console.log('Token expired:', { now, expiration })
      return new Response(
        JSON.stringify({ error: 'QR code has expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // Check if student is enrolled in this class
    const { data: enrollmentData, error: enrollmentError } = await supabaseClient
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('class_id', classData.id)
      .maybeSingle()

    if (enrollmentError) {
      console.log('Database error checking enrollment:', enrollmentError)
      return new Response(
        JSON.stringify({ error: 'Database error checking enrollment' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    if (!enrollmentData) {
      console.log('Student not enrolled in class')
      return new Response(
        JSON.stringify({ error: 'You are not enrolled in this class' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // Check if attendance was already marked today
    const sessionDate = new Date().toISOString().split('T')[0]
    const { data: existingAttendance } = await supabaseClient
      .from('attendance')
      .select('id')
      .eq('student_id', user.id)
      .eq('class_id', classData.id)
      .eq('session_date', sessionDate)
      .maybeSingle()

    if (existingAttendance) {
      console.log('Attendance already marked for today')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Attendance already marked for today',
          alreadyMarked: true,
          classId: classData.id,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    // Mark attendance (insert new record)
    const { error: attendanceError } = await supabaseClient
      .from('attendance')
      .insert({
        student_id: user.id,
        class_id: classData.id,
        status: 'present',
        session_date: sessionDate,
        timestamp: new Date().toISOString(),
      })

    if (attendanceError) {
      console.log('Error marking attendance:', attendanceError)
      return new Response(
        JSON.stringify({ error: 'Failed to mark attendance' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        },
      )
    }

    console.log('Attendance marked successfully for user:', user.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Attendance marked successfully',
        alreadyMarked: false,
        classId: classData.id,
        sessionDate 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )

  } catch (error) {
    console.error('Error in verify-qr-token function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )
  }
})