const { extractExifData } = require('./metadataExtractor');
const { detectAndDescribeFaces } = require('./facialRecognition');
const path = require('path');

// --- Date Categorization ---
function parseExifDate(exifData) {
  if (!exifData) return null;
  const dateFields = ['DateTimeOriginal', 'CreateDate', 'ModifyDate'];
  for (const field of dateFields) {
    if (exifData[field]) {
      let dateStr = String(exifData[field]);
      if (typeof dateStr === 'string' && dateStr.length >= 19) {
        dateStr = dateStr.substring(0, 10).replace(/:/g, '-') + 'T' + dateStr.substring(11, 19);
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  if (exifData.DateTimeOriginal && typeof exifData.DateTimeOriginal === 'number') {
    const date = new Date(exifData.DateTimeOriginal * 1000);
    if (!isNaN(date.getTime())) return date;
  }
 return null;
}

async function categorizeByDate(imagePath) {
  try {
    const exifData = await extractExifData(imagePath);
    if (!exifData) return null;
    const date = parseExifDate(exifData);
    if (date) {
      return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error categorizing by date for ${imagePath}:`, error);
    return null;
  }
}

// --- Location Categorization ---
function convertDMSToDD(dmsArray, ref) {
  if (!dmsArray || dmsArray.length !== 3) return null;
  const [degrees, minutes, seconds] = dmsArray;
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (ref === 'S' || ref === 'W') dd = -dd;
  return dd;
}

async function categorizeByLocation(imagePath) {
  try {
    const exifData = await extractExifData(imagePath);
    if (!exifData || !exifData.GPSLatitude || !exifData.GPSLongitude || !exifData.GPSLatitudeRef || !exifData.GPSLongitudeRef) return null;
    const latitude = convertDMSToDD(exifData.GPSLatitude, exifData.GPSLatitudeRef);
    const longitude = convertDMSToDD(exifData.GPSLongitude, exifData.GPSLongitudeRef);
    if (latitude !== null && longitude !== null) return { latitude, longitude };
    else return null;
  } catch (error) {
    console.error(`Error categorizing by location for ${imagePath}:`, error);
    return null;
  }
}

// --- People Categorization ---
async function getFaceDescriptors(imagePath) {
  try {
    const detections = await detectAndDescribeFaces(imagePath);
    if (!detections || detections.length === 0) return [];
    return detections.map(d => d.descriptor);
  } catch (error) {
    console.error(`Error getting face descriptors for ${imagePath}:`, error);
    return [];
  }
}

// --- Event Suggestion Data ---
/**
 * Gathers data (date and location) that can be used to suggest or group events.
 * @param {string} imagePath - The path to the image file.
 * @returns {Promise<{date: {year: number, month: number, day: number}|null, location: {latitude: number, longitude: number}|null}>}
 * A promise that resolves with an object containing date and location data, or nulls if not available.
 */
async function getEventSuggestionData(imagePath) {
  try {
    const dateData = await categorizeByDate(imagePath);
    const locationData = await categorizeByLocation(imagePath);
    return { date: dateData, location: locationData };
  } catch (error) {
    console.error(`Error getting event suggestion data for ${imagePath}:`, error);
    return { date: null, location: null };
  }
}

module.exports = {
  parseExifDate,
  categorizeByDate,
  convertDMSToDD,
  categorizeByLocation,
  getFaceDescriptors,
  getEventSuggestionData
};

console.log('Event suggestion data function added to src/core/imageCategorizer.js');
