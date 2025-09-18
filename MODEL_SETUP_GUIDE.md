# Face Recognition Model Setup Guide

## Step 1: Create Models Directory
Create a `models` folder in your public directory:

```
attend-easy-qr-main/
├── public/
│   ├── models/          <- Create this folder
│   │   └── facenet.onnx <- Place your model file here
│   ├── favicon.ico
│   └── ...
```

## Step 2: Download a Face Recognition Model

### Option A: FaceNet (Recommended for beginners)
1. Go to: https://github.com/onnx/models/tree/main/vision/body_analysis/facenet
2. Download the `.onnx` model file
3. Rename it to `facenet.onnx`
4. Place it in `public/models/facenet.onnx`

### Option B: ArcFace (Higher accuracy)
1. Visit: https://github.com/deepinsight/insightface/tree/master/model_zoo
2. Look for ONNX format models
3. Download a model like `arcface_r100_v1.onnx`
4. Place it in `public/models/` and update the config

### Option C: Use a Ready-Made Model
I can help you find a direct download link for a working model.

## Step 3: Update Model Configuration

Once you have the model, update the configuration in the code to match your model's specifications.

## Alternative: Skip Model for Now

If you want to test the system without the model:
1. The UI will work perfectly
2. Face capture will work
3. Only the actual face recognition will fail gracefully
4. You can add the model later

## Need Help?

Let me know which option you prefer and I can:
1. Help you find a specific model download link
2. Guide you through the configuration
3. Set up a mock/test mode for development