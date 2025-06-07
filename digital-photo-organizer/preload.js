const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Metadata
  getExifData: (imagePath) => ipcRenderer.invoke('get-exif-data', imagePath),
  // Categorization
  categorizeByDate: (imagePath) => ipcRenderer.invoke('categorize-by-date', imagePath),
  categorizeByLocation: (imagePath) => ipcRenderer.invoke('categorize-by-location', imagePath),
  getFaceDescriptors: (imagePath) => ipcRenderer.invoke('get-face-descriptors', imagePath),
  getEventSuggestionData: (imagePath) => ipcRenderer.invoke('get-event-suggestion-data', imagePath),
  // Duplicate Detection
  generateDHash: (imagePath) => ipcRenderer.invoke('generate-dhash', imagePath),
  findDuplicates: (imagePaths, threshold) => ipcRenderer.invoke('find-duplicates', imagePaths, threshold),
  // Blurry Image Detection
  calculateLaplacianVariance: (imagePath) => ipcRenderer.invoke('calculate-laplacian-variance', imagePath),
  isImageBlurry: (imagePath, threshold) => ipcRenderer.invoke('is-image-blurry', imagePath, threshold),
  // File System
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  readImageFilesInDirectory: (directoryPath) => ipcRenderer.invoke('fs:readImageFilesInDirectory', directoryPath),
  // Database operations
  addImageRecord: (imageData) => ipcRenderer.invoke('db:addImageRecord', imageData),
  getImageRecordByPath: (imagePath) => ipcRenderer.invoke('db:getImageRecordByPath', imagePath),
  updateImageRecord: (imagePath, updateData) => ipcRenderer.invoke('db:updateImageRecord', imagePath, updateData)
});

console.log('Preload script (preload.js) updated with DB API methods.');
