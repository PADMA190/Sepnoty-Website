const fs = require('fs');
const exifParser = require('exif-parser');

/**
 * Extracts EXIF metadata from an image file.
 * @param {string} imagePath - The path to the image file.
 * @returns {Promise<object|null>} A promise that resolves with the EXIF data object, or null if an error occurs or no EXIF data is found.
 */
async function extractExifData(imagePath) {
  try {
    const buffer = fs.readFileSync(imagePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    return result.tags; // Return only the tags object which contains the EXIF data
  } catch (error) {
    console.error('Error extracting EXIF data:', error.message);
    if (error.message.includes('Invalid JPEG section offset')) {
      console.warn(`Warning: Could not parse EXIF data for ${imagePath}. File might not be a valid JPEG or may lack EXIF info.`);
    } else if (error.code === 'ENOENT') {
      console.error(`Error: Image file not found at ${imagePath}`);
    }
    return null;
  }
}

module.exports = { extractExifData };

console.log('src/core/metadataExtractor.js created successfully.');
