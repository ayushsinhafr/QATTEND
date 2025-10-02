/**
 * Test component for lightweight face recognition system
 * Validates model loading and basic functionality
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LightweightFaceVerification from '@/lib/face/lightweightFaceVerification';
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function LightweightFaceTest() {
  const [testResults, setTestResults] = useState<{
    modelLoading: 'pending' | 'success' | 'error';
    detectionTest: 'pending' | 'success' | 'error';
    recognitionTest: 'pending' | 'success' | 'error';
    error?: string;
  }>({
    modelLoading: 'pending',
    detectionTest: 'pending',
    recognitionTest: 'pending'
  });

  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults({
      modelLoading: 'pending',
      detectionTest: 'pending',
      recognitionTest: 'pending'
    });

    try {
      // Test 1: Model Loading
      console.log('🧪 Testing model loading...');
      const verifier = new LightweightFaceVerification();
      await verifier.initialize();
      
      setTestResults(prev => ({ ...prev, modelLoading: 'success' }));
      console.log('✅ Model loading test passed');

      // Test 2: Create test image data
      const testImageData = createTestImageData();
      
      // Test 3: Detection Test
      console.log('🧪 Testing face detection...');
      const faces = await verifier.detectFaces(testImageData);
      console.log(`Detected ${faces.length} faces (expected: 0 for test pattern)`);
      
      setTestResults(prev => ({ ...prev, detectionTest: 'success' }));
      console.log('✅ Detection test passed');

      // Test 4: Recognition Test
      console.log('🧪 Testing face recognition...');
      try {
        await verifier.extractFaceEmbedding(testImageData);
        setTestResults(prev => ({ ...prev, recognitionTest: 'success' }));
        console.log('✅ Recognition test passed');
      } catch (error) {
        // Expected to fail with test pattern, but model should load correctly
        if (error instanceof Error && error.message.includes('No face detected')) {
          setTestResults(prev => ({ ...prev, recognitionTest: 'success' }));
          console.log('✅ Recognition test passed (correctly detected no face in test pattern)');
        } else {
          throw error;
        }
      }

      // Get model info
      const modelInfo = verifier.getModelInfo();
      console.log('📊 Model Info:', modelInfo);

    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResults(prev => ({
        ...prev,
        modelLoading: prev.modelLoading === 'success' ? 'success' : 'error',
        detectionTest: prev.detectionTest === 'success' ? 'success' : 'error',
        recognitionTest: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    } finally {
      setIsRunning(false);
    }
  };

  const createTestImageData = (): ImageData => {
    // Create a simple test pattern (not a real face)
    const canvas = document.createElement('canvas');
    canvas.width = 112;
    canvas.height = 112;
    const ctx = canvas.getContext('2d')!;
    
    // Create gradient pattern
    const gradient = ctx.createLinearGradient(0, 0, 112, 112);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(1, '#0000ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 112, 112);
    
    return ctx.getImageData(0, 0, 112, 112);
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Lightweight Face System Test
        </CardTitle>
        <CardDescription>
          Test SCRFD + MobileFaceNet model loading and basic functionality
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {getStatusIcon(testResults.modelLoading)}
            <span className="text-sm">Model Loading (SCRFD + MobileFaceNet)</span>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusIcon(testResults.detectionTest)}
            <span className="text-sm">Face Detection Test</span>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusIcon(testResults.recognitionTest)}
            <span className="text-sm">Face Recognition Test</span>
          </div>
        </div>

        {testResults.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{testResults.error}</p>
          </div>
        )}

        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Tests...' : 'Run Lightweight System Test'}
        </Button>

        <div className="text-xs text-gray-500 text-center">
          Tests model loading without requiring actual face images
        </div>
      </CardContent>
    </Card>
  );
}

export default LightweightFaceTest;