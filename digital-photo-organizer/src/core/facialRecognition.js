const faceapi = require('face-api.js');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

// Path to the models directory (assuming it will be in the project root or a specific assets folder later)
const MODELS_URL = path.join(__dirname, '../../models'); // Adjust if models are stored elsewhere

let modelsLoaded = false;

/**
 * Loads all necessary pre-trained models for face-api.js.
 * This function should be called once during application initialization.
 */
async function loadModels() {
  if (modelsLoaded) {
    console.log('Models already loaded.');
    return;
  }
  try {
    // Ensure the models directory exists
    if (!fs.existsSync(MODELS_URL)) {
      console.error(`Models directory not found at ${MODELS_URL}. Please download and place models there.`);
      // Instructions for models: User will need to download them separately from face-api.js repository
      // e.g., from https://github.com/justadudewhohacks/face-api.js/tree/master/weights
      // and place them in a 'models' folder in the project root.
      throw new Error('Models directory not found. See console for details.');
    }

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_URL);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_URL);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_URL);
    // Optional: Load other models if needed, e.g., ageGenderNet, tinyFaceDetector
    // await faceapi.nets.ageGenderNet.loadFromDisk(MODELS_URL);
    // await faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_URL);
    modelsLoaded = true;
    console.log('Face recognition models loaded successfully.');
  } catch (error) {
    console.error('Error loading face recognition models:', error);
    throw error; // Re-throw to indicate failure
  }
}

/**
 * Decodes an image from a file path into a tf.Tensor3D.
 * @param {string} imagePath - Path to the image file.
 * @returns {Promise<tf.Tensor3D|null>} Tensor representation of the image, or null on error.
 */
async function loadImage(imagePath) {
  try {
    const buffer = fs.readFileSync(imagePath);
    const imageTensor = tf.node.decodeImage(buffer, 3); // 3 for RGB channels
    return imageTensor;
  } catch (error) {
    console.error(`Error loading image ${imagePath}:`, error);
    return null;
  }
}

/**
 * Detects all faces in an image.
 * @param {string} imagePath - Path to the image file.
 * @returns {Promise<faceapi.WithFaceLandmarks<faceapi.WithFaceDescriptor>[]>} An array of detected faces with landmarks and descriptors.
 */
async function detectAndDescribeFaces(imagePath) {
  if (!modelsLoaded) {
    console.warn('Models not loaded. Attempting to load models first.');
    await loadModels();
  }

  const imageTensor = await loadImage(imagePath);
  if (!imageTensor) {
    return [];
  }

  let detections = [];
  try {
    // face-api.js uses SsdMobilenetv1Options by default for its SsdMobilenetv1 model
    // You can customize options, e.g., minConfidence
    const detectionOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
    detections = await faceapi.detectAllFaces(imageTensor, detectionOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();
  } catch (error) {
    console.error(`Error detecting faces in ${imagePath}:`, error);
  } finally {
    tf.dispose(imageTensor); // Dispose the tensor to free up memory
  }
  return detections;
}

module.exports = {
  loadModels,
  detectAndDescribeFaces,
  MODELS_URL // Export for potential configuration or download scripts
};

console.log('src/core/facialRecognition.js created successfully.');
