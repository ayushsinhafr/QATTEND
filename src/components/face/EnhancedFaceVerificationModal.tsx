/**
 * Enhanced Face Verification Modal with Lightweight Model Support
 * Supports both standard FaceNet and lightweight SCRFD+MobileFaceNet
 */

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import FaceCamera, { FaceCameraRef } from './FaceCamera';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import FaceEmbedder from '../../lib/face/embedder';
import LightweightFaceVerification from '../../lib/face/lightweightFaceVerification';
import EnhancedFaceVerification from '../../lib/face/enhancedFaceVerification';
import { calculateEmbeddingQuality } from '../../lib/face/faceUtils';
import { useFaceSystemConfig } from '../../hooks/useFaceSystemConfig';
import { X, CheckCircle, AlertCircle, Camera, User, Zap, Settings, Star } from 'lucide-react';

interface EnhancedFaceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentId: string;
  classId: string;
  sessionInfo: {
    sessionId: string;
    sessionDate: string;
    sessionDateTime: string;
  };
}

export function EnhancedFaceVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  studentId,
  classId,
  sessionInfo
}: EnhancedFaceVerificationModalProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [lightweightVerifier, setLightweightVerifier] = useState<LightweightFaceVerification | null>(null);
  const [enhancedVerifier, setEnhancedVerifier] = useState<EnhancedFaceVerification | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const { toast } = useToast();
  const cameraRef = useRef<FaceCameraRef>(null);
  const { config, updateConfig, setSystemType } = useFaceSystemConfig();

  // Initialize the appropriate face verification system
  useEffect(() => {
    const initializeSystem = async () => {
      if (!isOpen) return;
      
      setIsInitializing(true);
      try {
        if (config.systemType === 'lightweight') {
          console.log('🚀 Initializing lightweight face verification system...');
          const verifier = new LightweightFaceVerification();
          await verifier.initialize();
          setLightweightVerifier(verifier);
          setEnhancedVerifier(null);
          console.log('✅ Lightweight system ready');
        } else if (config.systemType === 'enhanced') {
          console.log('� Initializing enhanced face verification system...');
          const verifier = new EnhancedFaceVerification();
          await verifier.initialize();
          setEnhancedVerifier(verifier);
          setLightweightVerifier(null);
          console.log('✅ Enhanced system ready');
        } else {
          console.log('🔄 Using standard FaceNet system...');
          setLightweightVerifier(null);
          setEnhancedVerifier(null);
        }
      } catch (error) {
        console.error(`❌ Failed to initialize ${config.systemType} face verification system:`, error);
        toast({
          title: "Initialization Error",
          description: `Failed to load ${config.systemType} face recognition models. Falling back to standard system.`,
          variant: "destructive",
        });
        setSystemType('standard');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSystem();
  }, [isOpen, config.systemType]);

  const getImageDataFromCanvas = (canvas: HTMLCanvasElement): ImageData => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const handleLightweightVerification = async (canvas: HTMLCanvasElement) => {
    if (!lightweightVerifier) {
      throw new Error('Lightweight verifier not initialized');
    }

    try {
      // Convert canvas to ImageData
      const imageData = getImageDataFromCanvas(canvas);
      console.log(`🖼️ Processing image: ${imageData.width}x${imageData.height}`);
      
      // First try to detect faces
      const faces = await lightweightVerifier.detectFaces(imageData);
      console.log(`🔍 Detection result: ${faces.length} faces found`);
      
      if (faces.length === 0) {
        // Fallback: try with lower threshold or different preprocessing
        console.log('🔄 No faces detected, trying with lower threshold...');
        const originalThreshold = config.detectionThreshold;
        updateConfig({ detectionThreshold: 0.1 }); // Very low threshold
        
        try {
          const facesLowThresh = await lightweightVerifier.detectFaces(imageData);
          console.log(`🔍 Low threshold result: ${facesLowThresh.length} faces found`);
          updateConfig({ detectionThreshold: originalThreshold }); // Restore original
          
          if (facesLowThresh.length === 0) {
            throw new Error('No face detected even with low threshold. Please ensure your face is clearly visible, well-lit, and facing the camera directly.');
          }
        } catch (error) {
          updateConfig({ detectionThreshold: originalThreshold }); // Restore original
          throw error;
        }
      }
      
      // Process image for enrollment (extract embedding)
      const result = await lightweightVerifier.processImageForEnrollment(imageData);
      
      if (!result) {
        throw new Error('Failed to extract face embedding. Please try again with better lighting.');
      }

      // Check quality based on confidence
      if (result.confidence < config.detectionThreshold) {
        console.warn(`⚠️ Low confidence: ${result.confidence}, threshold: ${config.detectionThreshold}`);
        // Don't throw error, just warn - proceed with lower confidence
      }

      console.log(`✅ Lightweight verification - Confidence: ${result.confidence.toFixed(3)}, Embedding size: ${result.embedding.length}`);
      
      return {
        embedding: result.embedding,
        quality: result.confidence
      };
    } catch (error) {
      console.error('❌ Lightweight verification failed:', error);
      throw error;
    }
  };

  const handleStandardVerification = async (canvas: HTMLCanvasElement) => {
    // Extract face embedding using standard system
    const embedder = FaceEmbedder.getInstance();
    const result = await embedder.extractEmbedding(canvas);
    
    if (!result || !result.embedding) {
      throw new Error('No face detected. Please ensure your face is clearly visible and try again.');
    }

    const embedding = result.embedding;
    const quality = calculateEmbeddingQuality(Array.from(embedding));
    
    console.log('🔍 Standard verification - Quality:', quality, 'Threshold:', config.verificationThreshold);
    
    if (quality < config.verificationThreshold) {
      throw new Error(`Face quality too low (${quality.toFixed(2)}). Please ensure good lighting and face the camera directly.`);
    }

    return {
      embedding,
      quality
    };
  };

  const handleCapture = async () => {
    if (!cameraRef.current) {
      setErrorMessage('Camera not ready. Please wait and try again.');
      return;
    }

    if (isInitializing) {
      setErrorMessage('Face recognition system is still initializing. Please wait.');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('processing');
    setErrorMessage('');

    try {
      // Capture image from camera
      const canvas = await cameraRef.current.capture();
      if (!canvas) {
        setVerificationStatus('failed');
        setErrorMessage('Failed to capture image. Please try again.');
        return;
      }

      let verificationResult;

      // Use appropriate verification system
      if (config.useLightweight && lightweightVerifier) {
        console.log('🔄 Using lightweight verification system...');
        verificationResult = await handleLightweightVerification(canvas);
      } else {
        console.log('🔄 Using standard verification system...');
        verificationResult = await handleStandardVerification(canvas);
      }

      const { embedding, quality } = verificationResult;

      // Verify face with backend
      const { data, error } = await supabase.functions.invoke('verify-face-attendance', {
        body: {
          class_id: sessionInfo.sessionId,
          embedding: Array.from(embedding),
          session_info: sessionInfo,
          verification_method: config.useLightweight ? 'lightweight' : 'standard'
        }
      });

      if (error) {
        console.error('Face verification error:', error);
        setVerificationStatus('failed');
        setErrorMessage(error.message || 'Verification failed. Please try again.');
        return;
      }

      // Handle successful verification
      setVerificationStatus('success');
      toast({
        title: "Verification Successful",
        description: `Face verified successfully using ${config.useLightweight ? 'lightweight' : 'standard'} system (Quality: ${quality.toFixed(2)})`,
      });

      // Auto-close after success
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Face verification failed:', error);
      setVerificationStatus('failed');
      
      let errorMsg = error instanceof Error ? error.message : 'Verification failed. Please try again.';
      
      // If lightweight failed, suggest switching to standard
      if (config.useLightweight && errorMsg.includes('No face detected')) {
        errorMsg += '\n\nTip: Try switching to Standard mode if issues persist.';
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setVerificationStatus('idle');
    setErrorMessage('');
    onClose();
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'processing':
        return <Camera className="h-6 w-6 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <User className="h-6 w-6" />;
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'processing':
        return `Verifying using ${config.useLightweight ? 'lightweight' : 'standard'} system...`;
      case 'success':
        return 'Verification successful!';
      case 'failed':
        return errorMessage || 'Verification failed';
      default:
        return `Ready to verify using ${config.useLightweight ? 'lightweight (SCRFD+MobileFaceNet)' : 'standard (FaceNet)'} system`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Face Verification
            {config.useLightweight && (
              <span title="Lightweight Mode">
                <Zap className="h-4 w-4 text-yellow-500" />
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {getStatusMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* System Settings Toggle */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">
                {config.useLightweight ? 'Lightweight' : 'Standard'} Mode
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLightweight}
              disabled={isVerifying || isInitializing}
            >
              Switch to {config.useLightweight ? 'Standard' : 'Lightweight'}
            </Button>
          </div>

          {/* Camera Component */}
          <div className="relative">
            <FaceCamera ref={cameraRef} />
            {isInitializing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="text-white text-center">
                  <Camera className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Initializing face recognition...</p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleCapture}
              disabled={isVerifying || verificationStatus === 'success' || isInitializing}
              className="flex-1"
            >
              {isVerifying ? 'Verifying...' : 'Verify Face'}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* System Info */}
          {config.useLightweight && lightweightVerifier && (
            <div className="text-xs text-gray-500 text-center">
              Lightweight: SCRFD (2.5MB) + MobileFaceNet (13.6MB) = 91% size reduction
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedFaceVerificationModal;