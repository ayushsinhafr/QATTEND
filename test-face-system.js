// Test script to verify face recognition functions
// Run this in browser console after logging in

async function testFaceSystem() {
  console.log('🧪 Testing Face Recognition System...');
  
  // 1. Test if user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('❌ No active session. Please log in first.');
    return;
  }
  
  console.log('✅ User authenticated:', session.user.id);
  
  // 2. Check if face profile exists
  console.log('🔍 Checking for existing face profile...');
  
  const { data: profile, error: profileError } = await supabase
    .from('face_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();
  
  if (profileError && profileError.code !== 'PGRST116') {
    console.log('❌ Error checking profile:', profileError);
    return;
  }
  
  if (profile) {
    console.log('✅ Face profile exists:', profile);
  } else {
    console.log('ℹ️ No face profile found. Please enroll your face first.');
  }
  
  // 3. Test database tables
  console.log('🗃️ Testing database tables...');
  
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance')
    .select('*')
    .limit(1);
    
  if (attendanceError) {
    console.log('❌ Error accessing attendance table:', attendanceError);
  } else {
    console.log('✅ Attendance table accessible');
  }
  
  // 4. Test functions accessibility
  console.log('🔧 Testing function accessibility...');
  
  try {
    // Test store-face-profile (this should fail with bad request since we're not sending data)
    const { data: storeData, error: storeError } = await supabase.functions.invoke('store-face-profile', {
      body: {}
    });
    
    if (storeError && storeError.message.includes('Embeddings array is required')) {
      console.log('✅ store-face-profile function is accessible and working');
    } else {
      console.log('❌ Unexpected response from store-face-profile:', storeError || storeData);
    }
  } catch (err) {
    console.log('❌ Error calling store-face-profile:', err);
  }
  
  try {
    // Test verify-face-attendance (this should fail with bad request since we're not sending data)
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-face-attendance', {
      body: {}
    });
    
    if (verifyError && verifyError.message.includes('class_id is required')) {
      console.log('✅ verify-face-attendance function is accessible and working');
    } else {
      console.log('❌ Unexpected response from verify-face-attendance:', verifyError || verifyData);
    }
  } catch (err) {
    console.log('❌ Error calling verify-face-attendance:', err);
  }
  
  console.log('🏁 Test completed!');
}

// Auto-run test
testFaceSystem();