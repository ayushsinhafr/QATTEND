import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import FaceModelManager from '@/lib/face/modelLoader';

export function ModelPreloadIndicator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const preloadModels = async () => {
      try {
        await FaceModelManager.getInstance().loadModel();
        setIsLoaded(true);
        setError(null);
      } catch (err) {
        console.warn('Model preload failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        setIsLoading(false);
      }
    };

    preloadModels();
  }, []);

  if (!isLoading && !error) {
    return null; // Hide when successfully loaded
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 max-w-sm border">
      <div className="flex items-center gap-3">
        {isLoading && (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <div>
              <p className="text-sm font-medium">Loading Face Recognition</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Preparing models for faster verification...
              </p>
            </div>
          </>
        )}
        
        {error && (
          <>
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium">Model Loading Issue</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Face recognition will load on demand
              </p>
            </div>
          </>
        )}
        
        {isLoaded && (
          <>
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">Models Ready</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Face recognition is optimized
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}