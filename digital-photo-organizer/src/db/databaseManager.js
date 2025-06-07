const Datastore = require('nedb');
const path = require('path');
const { app } = require('electron'); // Required to get userData path

let db = {};
let dbPath;

/**
 * Initializes the NeDB databases.
 * Ensures that 'app' is available to get the userData path.
 */
function initializeDatabase() {
  if (!app) {
    console.error('Electron app object is not available for database initialization.');
    // This typically means initializeDatabase is called before app is ready or from a wrong process.
    // Await app.whenReady() before calling this, or pass app object.
    throw new Error('App not ready for DB initialization');
  }
  dbPath = app.getPath('userData');
  console.log(`Database path: ${dbPath}`);

  db.images = new Datastore({ filename: path.join(dbPath, 'images.db'), autoload: true });
  db.faces = new Datastore({ filename: path.join(dbPath, 'faces.db'), autoload: true });
  db.people = new Datastore({ filename: path.join(dbPath, 'people.db'), autoload: true });

  // Optional: Add indexing for frequently queried fields
  db.images.ensureIndex({ fieldName: 'path', unique: true }, (err) => {
    if (err) console.error('Error setting index on images.path:', err);
  });
  db.faces.ensureIndex({ fieldName: 'imageId' }, (err) => { // imageId will link to _id in images.db
    if (err) console.error('Error setting index on faces.imageId:', err);
  });
  console.log('Databases initialized/loaded.');
}

// --- Image DB Functions ---
async function addImageRecord(imageData) {
  return new Promise((resolve, reject) => {
    db.images.insert(imageData, (err, newDoc) => {
      if (err) reject(err);
      else resolve(newDoc);
    });
  });
}

async function getImageRecordByPath(imagePath) {
  return new Promise((resolve, reject) => {
    db.images.findOne({ path: imagePath }, (err, doc) => {
      if (err) reject(err);
      else resolve(doc);
    });
  });
}

async function updateImageRecord(imagePath, updateData) {
  return new Promise((resolve, reject) => {
    db.images.update({ path: imagePath }, { $set: updateData }, {}, (err, numReplaced) => {
      if (err) reject(err);
      else resolve(numReplaced);
    });
  });
}

// TODO: Add functions for faces.db and people.db as needed

module.exports = {
  initializeDatabase,
  addImageRecord,
  getImageRecordByPath,
  updateImageRecord,
  // getDbInstance: () => db // Potentially expose db instances if direct access is needed carefully
};

console.log('src/db/databaseManager.js created.');
