# Face Recognition Attendance System

## Overview

This document describes the face recognition attendance system that has been integrated into QAttend. The system provides an additional layer of security for attendance marking by requiring students to verify their identity through face recognition alongside QR code scanning.

## Architecture

### Database Schema
The face recognition system adds several new tables to the database:

- **`face_profiles`**: Stores basic face profile information for each user
- **`face_profile_embeddings`**: Stores multiple face embedding samples for each profile
- **`face_verification_attempts`**: Logs all verification attempts for security monitoring
- **`face_config`**: Configuration settings for the face recognition system

The `classes` table has been extended with a `face_verification_enabled` boolean column to control whether face verification is required for each class.

### Components

#### 1. Face Model Loading (`src/lib/face/modelLoader.ts`)
- Manages ONNX model loading and configuration
- Supports WebGL and WebGPU acceleration
- Lazy loads models only when needed

#### 2. Face Embedder (`src/lib/face/embedder.ts`)
- Extracts face embeddings from images using ONNX runtime
- Preprocesses images to the required format
- Returns 512-dimensional face embedding vectors

#### 3. Face Utilities (`src/lib/face/faceUtils.ts`)
- Device fingerprinting for security
- Embedding validation and quality scoring
- Camera access management
- Rate limiting utilities

#### 4. Face Camera Component (`src/components/face/FaceCamera.tsx`)
- Reusable camera interface with capture capabilities
- Handles camera permissions and error states
- Provides guided capture interface

#### 5. Face Verification Modal (`src/components/face/FaceVerificationModal.tsx`)
- Modal interface for attendance verification
- Integrates camera capture with face embedding extraction
- Provides user feedback and error handling

### Edge Functions

#### 1. Store Face Profile (`supabase/functions/store-face-profile/index.ts`)
- Handles face enrollment during the initial setup
- Requires 3-5 face samples for robust identification
- Averages multiple embeddings for better accuracy
- Implements rate limiting and replay protection

#### 2. Verify Face Attendance (`supabase/functions/verify-face-attendance/index.ts`)
- Verifies student identity during attendance marking
- Compares captured face against stored profiles
- Implements similarity threshold checking
- Logs verification attempts for security monitoring

## Security Features

### 1. Device Fingerprinting
- Tracks device characteristics to prevent spoofing
- Includes screen resolution, timezone, language, and platform info
- Helps identify suspicious verification patterns

### 2. Rate Limiting
- Prevents brute force attacks on face verification
- Implements per-user and per-device limits
- Configurable limits through database settings

### 3. Replay Attack Prevention
- Generates unique nonces for each verification attempt
- Prevents reuse of captured face images
- Time-based validation with configurable expiration

### 4. Quality Scoring
- Ensures face images meet minimum quality requirements
- Checks embedding magnitude and distribution
- Rejects low-quality or corrupted face data

## User Flows

### 1. Face Enrollment (One-time setup)
1. Student navigates to face enrollment page
2. System requests camera permission
3. Student captures 5 face photos with different poses:
   - Front-facing
   - Looking left
   - Looking right
   - Looking up
   - Smiling
4. System processes and validates each capture
5. Face profile is created with averaged embeddings

### 2. Face-Verified Attendance
1. Student scans QR code for attendance
2. If class has face verification enabled:
   - System opens face verification modal
   - Student captures face photo
   - System extracts embedding and compares with profile
   - If verification succeeds, attendance is marked
3. If class doesn't require face verification:
   - Attendance is marked directly (existing flow)

## Configuration

### Database Migration
Run the face recognition migration to set up the required tables:
```sql
-- Apply migration file: 20250916000001_add_face_recognition.sql
```

### Class Configuration
Faculty can enable/disable face verification per class:
```sql
UPDATE classes 
SET face_verification_enabled = true 
WHERE id = 'class-id';
```

### System Settings
Configure verification thresholds and limits in the `face_config` table:
- `similarity_threshold`: Minimum similarity score for verification (default: 0.7)
- `max_daily_attempts`: Maximum verification attempts per user per day (default: 50)
- `max_enrollment_attempts`: Maximum enrollment attempts per user (default: 5)

## Privacy and Compliance

### Data Storage
- Face embeddings are mathematical representations, not images
- Original images are not stored after processing
- Embeddings are encrypted at rest in the database

### Data Retention
- Verification attempts are logged with configurable retention periods
- Face profiles can be deleted upon user request
- Audit logs maintain compliance records

### User Consent
- Clear consent flow during enrollment process
- Users can opt-out of face recognition (classes may restrict access)
- Transparent data usage policies

## Troubleshooting

### Common Issues

#### 1. "No face detected"
- Ensure good lighting conditions
- Face should be clearly visible and unobstructed
- Remove sunglasses, masks, or other face coverings

#### 2. "Face quality too low"
- Improve lighting conditions
- Ensure camera is clean and in focus
- Hold device steady during capture

#### 3. "Verification failed"
- Face may have changed significantly since enrollment
- Re-enroll if necessary
- Check for lighting or angle differences

#### 4. "Camera not available"
- Grant camera permissions in browser
- Ensure no other applications are using the camera
- Try refreshing the page or restarting the browser

### Technical Debugging

#### Browser Compatibility
- Chrome/Edge: Full support with WebGL/WebGPU acceleration
- Firefox: Supported with WebGL acceleration
- Safari: Basic support (no WebGPU)
- Mobile browsers: Supported on modern devices

#### Performance Optimization
- Models are cached in browser storage after first load
- WebGL acceleration reduces processing time
- Embedding extraction typically takes 1-3 seconds

## Future Enhancements

### Planned Features
1. **Live Verification**: Real-time face detection during class sessions
2. **Anti-Spoofing**: Detection of photos or videos used for spoofing
3. **Group Verification**: Simultaneous verification of multiple students
4. **Behavioral Analytics**: Detection of unusual attendance patterns

### Integration Opportunities
1. **Identity Verification**: Integration with student ID systems
2. **Access Control**: Physical access to classrooms and labs
3. **Exam Monitoring**: Identity verification during online exams
4. **Visitor Management**: Face-based visitor tracking on campus

## Development Notes

### Testing
- Use development environment with local Supabase instance
- Test with various lighting conditions and face angles
- Verify cross-browser compatibility
- Performance testing with different device capabilities

### Deployment
1. Run database migration in production
2. Upload ONNX model files to public storage
3. Configure edge function secrets and environment variables
4. Enable face verification for pilot classes
5. Monitor system performance and user feedback

### Monitoring
- Track verification success rates
- Monitor edge function performance
- Review security logs for suspicious patterns
- Collect user feedback and improvement suggestions