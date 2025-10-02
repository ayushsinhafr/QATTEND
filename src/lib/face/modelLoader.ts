// Use dynamic import with proper error handling
// Remote model and wasm sources (Hugging Face)
const HF_BASE = 'https://huggingface.co/ayu5hsinha/qattend-face-models/resolve/main';
const HF_WASM_BASE = `${HF_BASE}/onnx-wasm/`;
const HF_FACENET_URL = `${HF_BASE}/facenet.onnx`;
const HF_DETECTION_URL = `${HF_BASE}/detection.onnx`;
let ortModule: any = null;

async function loadOnnxRuntime() {
  if (ortModule) {
    return ortModule;
  }

  try {
    // Try ES module import first
    ortModule = await import('onnxruntime-web');
    
    // Check if InferenceSession is available
    if (!ortModule.InferenceSession) {
      throw new Error('InferenceSession not found in module');
    }
    
    console.log('✅ ONNX Runtime loaded via ES module');
    return ortModule;
  } catch (error) {
    console.error('Failed to load ONNX Runtime via ES module:', error);
    
    // Fallback: try accessing global ort if available
    if (typeof window !== 'undefined' && (window as any).ort) {
      ortModule = (window as any).ort;
      console.log('✅ ONNX Runtime loaded via global');
      return ortModule;
    }
    
    throw new Error(`ONNX Runtime not available: ${error}`);
  }
}

// Configure ONNX Runtime when needed
async function configureOnnxRuntime() {
  try {
    const ort = await loadOnnxRuntime();
    if (ort.env) {
      ort.env.logLevel = 'warning';
      if (ort.env.wasm) {
        ort.env.wasm.numThreads = 1;
        // Prefer remote WASM assets; fall back to local if cross-origin fails at runtime
        ort.env.wasm.wasmPaths = HF_WASM_BASE;
        
        // Set up fallback to local WASM paths
        try {
          // Test if remote WASM is accessible
          await fetch(`${HF_WASM_BASE}ort-wasm.wasm`, { method: 'HEAD', mode: 'no-cors' });
        } catch (e) {
          console.log('Remote WASM not accessible, using local paths');
          ort.env.wasm.wasmPaths = '/models/onnxwasm/';
        }
      }
    }
  } catch (error) {
    console.warn('Failed to configure ONNX Runtime environment:', error);
    throw error;
  }
}

interface ModelConfig {
  name: string;
  embeddingSize: number;
  inputSize: {
    width: number;
    height: number;
    channels: number;
  };
  normalization: {
    mean: number[];
    std: number[];
  };
  format: string;
  fileName: string;
}

class FaceModelManager {
  private static instance: FaceModelManager;
  private session: any = null;
  private config: ModelConfig | null = null;
  private loading = false;

  private constructor() {}

  static getInstance(): FaceModelManager {
    if (!FaceModelManager.instance) {
      FaceModelManager.instance = new FaceModelManager();
    }
    return FaceModelManager.instance;
  }

  async loadModel(): Promise<any> {
    if (this.session) {
      return this.session;
    }

    if (this.loading) {
      // Wait for ongoing load
      while (this.loading && !this.session) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.session) return this.session;
    }

    try {
      this.loading = true;
      
      // Configure ONNX Runtime environment
      await configureOnnxRuntime();
      const ort = await loadOnnxRuntime();
      
      // Load model configuration (optional). If unavailable, use a sensible default for facenet.
      try {
        const configResponse = await fetch('/models/model-config.json');
        if (configResponse.ok) {
          this.config = await configResponse.json();
        } else {
          console.warn('model-config.json not found, using default FaceNet config');
        }
      } catch (e) {
        console.warn('Failed to fetch model-config.json, using default FaceNet config', e);
      }

      if (!this.config) {
        this.config = {
          name: 'facenet',
          embeddingSize: 512,
          inputSize: { width: 112, height: 112, channels: 3 },
          normalization: { mean: [0.5, 0.5, 0.5], std: [0.5, 0.5, 0.5] },
          format: 'onnx',
          fileName: 'facenet.onnx',
        };
      }

      // Load ONNX model
      console.log('🔄 Loading face recognition model...');
      // Prefer remote HF URL; fallback to local public assets
      const remoteUrl = this.config.name?.toLowerCase().includes('detect') ? HF_DETECTION_URL : HF_FACENET_URL;
      let arrayBuffer: ArrayBuffer | null = null;
      try {
        const remoteResp = await fetch(remoteUrl, { mode: 'cors' });
        if (!remoteResp.ok) throw new Error(`${remoteResp.status} ${remoteResp.statusText}`);
        arrayBuffer = await remoteResp.arrayBuffer();
        console.log('✅ Loaded model from Hugging Face:', remoteUrl);
      } catch (remoteErr) {
        console.warn('🌐 Remote model fetch failed, falling back to local /models path:', remoteErr);
        const localPath = `/models/${this.config.fileName}`;
        const localResp = await fetch(localPath);
        if (!localResp.ok) {
          throw new Error(`Failed to fetch model from both remote and local sources. Local error: ${localResp.status} ${localResp.statusText}`);
        }
        arrayBuffer = await localResp.arrayBuffer();
        console.log('✅ Loaded model from local path:', localPath);
      }
      
      // Check if InferenceSession is available
      if (!ort.InferenceSession) {
        throw new Error('ONNX Runtime InferenceSession not available - module import failed');
      }
      
      const modelBytes = new Uint8Array(arrayBuffer!);

      // Try provider preference: WASM (with remote wasm), then local WASM, then WebGPU, then WebGL
      const providersOrder: string[][] = [];
      providersOrder.push(['wasm']);
      const accel = FaceModelManager.checkAccelerationSupport();
      if (accel.webgpu) providersOrder.push(['webgpu']);
      if (accel.webgl) providersOrder.push(['webgl']);

      let lastError: any = null;
      for (let i = 0; i < providersOrder.length; i++) {
        const providers = providersOrder[i];
        try {
          this.session = await ort.InferenceSession.create(modelBytes, {
            executionProviders: providers as any,
            logSeverityLevel: 3,
            logVerbosityLevel: 0,
          });
          console.log(`✅ Face model session created with provider: ${providers.join(',')}`);
          break;
        } catch (e) {
          lastError = e;
          console.warn(`Provider ${providers.join(',')} failed:`, e);
          // If WASM failed on first attempt, try switching to local wasmPaths and retry once more
          if (providers.includes('wasm')) {
            try {
              const ort2 = await loadOnnxRuntime();
              if (ort2.env?.wasm) {
                console.log('🔁 Retrying WASM with local wasm paths /models/onnxwasm/...');
                ort2.env.wasm.wasmPaths = '/models/onnxwasm/';
                this.session = await ort2.InferenceSession.create(modelBytes, {
                  executionProviders: ['wasm'],
                  logSeverityLevel: 3,
                  logVerbosityLevel: 0,
                });
                console.log('✅ Face model session created with local WASM assets');
                break;
              }
            } catch (retryErr) {
              console.warn('Local WASM retry failed:', retryErr);
              lastError = retryErr;
            }
          }
        }
      }

      if (!this.session) {
        throw lastError || new Error('Failed to create ONNX InferenceSession with all providers');
      }

      console.log('✅ Face recognition model loaded successfully');
      return this.session;

    } catch (error) {
      console.error('❌ Failed to load face recognition model:', error);
      throw new Error(`Model loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.loading = false;
    }
  }

  getConfig(): ModelConfig | null {
    return this.config;
  }

  async isModelReady(): Promise<boolean> {
    try {
      await this.loadModel();
      return true;
    } catch {
      return false;
    }
  }

  // Check if WebGL/WebGPU is available for acceleration
  static checkAccelerationSupport(): {
    webgl: boolean;
    webgpu: boolean;
  } {
    const canvas = document.createElement('canvas');
    const webglSupported = !!(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    );

    const webgpuSupported = 'gpu' in navigator;

    return {
      webgl: webglSupported,
      webgpu: webgpuSupported
    };
  }

  // Preload model in background
  static preloadModel(): void {
    setTimeout(() => {
      FaceModelManager.getInstance().loadModel().catch(console.warn);
    }, 2000); // Preload after 2 seconds
  }
}

export default FaceModelManager;