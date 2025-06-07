const sharp = require('sharp');
const fs = require('fs');

/**
 * Calculates the variance of the Laplacian for an image to estimate sharpness.
 * @param {string} imagePath - Path to the image file.
 * @returns {Promise<number|null>} A promise that resolves with the Laplacian variance, or null on error.
 */
async function calculateLaplacianVariance(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);

    // Convert to grayscale and get pixel data
    const { data, info } = await sharp(imageBuffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (info.channels !== 1) {
      console.error('Image is not grayscale after conversion. Check sharp pipeline.');
      return null;
    }

    // Apply Laplacian operator using a common 3x3 kernel
    // Kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
    // We'll use sharp's convolve for this
    const laplacianKernel = {
      width: 3,
      height: 3,
      kernel: [
        0,  1,  0,
        1, -4,  1,
        0,  1,  0
      ]
    };

    const convolvedImage = await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } })
      .convolve(laplacianKernel)
      .raw()
      .toBuffer();

    // Calculate variance of the convolved image pixels
    let mean = 0;
    let M2 = 0;
    let n = 0;

    for (let i = 0; i < convolvedImage.length; i++) {
      n++;
      const delta = convolvedImage[i] - mean;
      mean += delta / n;
      M2 += delta * (convolvedImage[i] - mean);
    }

    if (n < 2) {
      return 0; // Not enough data points for variance
    }

    const variance = M2 / (n - 1);
    return variance;

  } catch (error) {
    console.error(`Error calculating Laplacian variance for ${imagePath}:`, error);
    return null;
  }
}

/**
 * Determines if an image is blurry based on Laplacian variance.
 * @param {string} imagePath - Path to the image file.
 * @param {number} sharpnessThreshold - Lower variance values indicate more blur. (e.g., 100).
 * @returns {Promise<boolean|null>} True if blurry, false if not, null on error.
 */
async function isImageBlurry(imagePath, sharpnessThreshold = 100) {
  const variance = await calculateLaplacianVariance(imagePath);
  if (variance === null) {
    return null; // Error occurred during variance calculation
  }
  return variance < sharpnessThreshold;
}

module.exports = { calculateLaplacianVariance, isImageBlurry };

console.log('src/core/blurryImageDetector.js created successfully.');
