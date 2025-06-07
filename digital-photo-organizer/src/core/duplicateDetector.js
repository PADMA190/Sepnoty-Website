const sharp = require('sharp');
const fs = require('fs');

/**
 * Generates a Difference Hash (dHash) for an image.
 * @param {string} imagePath - Path to the image file.
 * @param {number} hashWidth - Width for resizing (e.g., 9 for an 8x8 hash).
 * @param {number} hashHeight - Height for resizing (e.g., 8 for an 8x8 hash).
 * @returns {Promise<string|null>} A promise that resolves with the binary hash string, or null on error.
 */
async function generateDHash(imagePath, hashWidth = 9, hashHeight = 8) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const resizedImage = await sharp(imageBuffer)
      .grayscale()
      .resize(hashWidth, hashHeight, { fit: 'fill' })
      .raw()
      .toBuffer();

    let hash = '';
    // Iterate over rows
    for (let y = 0; y < hashHeight; y++) {
      // Iterate over columns (up to width - 1)
      for (let x = 0; x < hashWidth - 1; x++) {
        const leftPixelIndex = y * hashWidth + x;
        const rightPixelIndex = y * hashWidth + (x + 1);
        hash += resizedImage[leftPixelIndex] > resizedImage[rightPixelIndex] ? '1' : '0';
      }
    }
    return hash;
  } catch (error) {
    console.error(`Error generating dHash for ${imagePath}:`, error);
    return null;
  }
}

/**
 * Calculates the Hamming distance between two binary hash strings.
 * Assumes hashes are of the same length.
 * @param {string} hash1 - The first hash string.
 * @param {string} hash2 - The second hash string.
 * @returns {number} The Hamming distance, or -1 if hashes are invalid or different lengths.
 */
function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    // console.warn('Invalid hashes or unequal length for Hamming distance calculation.');
    return -1; // Indicate error or incompatibility
  }
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * Finds potential duplicate images from a list of image paths.
 * @param {Array<string>} imagePaths - An array of paths to images.
 * @param {number} similarityThreshold - Hamming distance threshold for considering images as duplicates (e.g., 5-10).
 * @returns {Promise<Array<Array<string>>>} A promise that resolves with an array of groups of duplicate image paths.
 */
async function findDuplicates(imagePaths, similarityThreshold = 5) {
  const hashes = []; // To store { path: string, hash: string }
  for (const imagePath of imagePaths) {
    const hash = await generateDHash(imagePath);
    if (hash) {
      hashes.push({ path: imagePath, hash });
    }
  }

  const duplicates = [];
  const processed = new Set(); // To keep track of images already added to a duplicate group

  for (let i = 0; i < hashes.length; i++) {
    if (processed.has(hashes[i].path)) {
      continue;
    }
    const currentGroup = [hashes[i].path];
    for (let j = i + 1; j < hashes.length; j++) {
      if (processed.has(hashes[j].path)) {
        continue;
      }
      const distance = hammingDistance(hashes[i].hash, hashes[j].hash);
      if (distance !== -1 && distance <= similarityThreshold) {
        currentGroup.push(hashes[j].path);
        processed.add(hashes[j].path);
      }
    }
    if (currentGroup.length > 1) {
      duplicates.push(currentGroup);
      processed.add(hashes[i].path); // Add the initial image of the group
    }
  }
  return duplicates;
}

module.exports = { generateDHash, hammingDistance, findDuplicates };

console.log('src/core/duplicateDetector.js created successfully.');
