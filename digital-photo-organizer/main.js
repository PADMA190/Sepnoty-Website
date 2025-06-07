const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron'); // Added Tray, Menu, nativeImage
const path = require('path');
const { dialog } = require('electron'); // Keep this, it's used by dialog handlers

// Core module imports - KEEP ALL EXISTING
const { extractExifData } = require('./src/core/metadataExtractor');
const { categorizeByDate, categorizeByLocation, getFaceDescriptors, getEventSuggestionData } = require('./src/core/imageCategorizer');
const { generateDHash, findDuplicates } = require('./src/core/duplicateDetector');
const { calculateLaplacianVariance, isImageBlurry } = require('./src/core/blurryImageDetector');
const { loadModels: loadFaceModels } = require('./src/core/facialRecognition');
const { initializeDatabase, addImageRecord, getImageRecordByPath, updateImageRecord } = require('./src/db/databaseManager');

let mainWindow; // Changed to let for reassignment
let tray = null;

function createWindow () {
  mainWindow = new BrowserWindow({ // Assign to global mainWindow
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'dist_renderer/index.html'));
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => { // Handle window being closed
    mainWindow = null;
  });

  // Optional: Hide window on minimize/close to tray if desired later
  // mainWindow.on('minimize', (event) => { event.preventDefault(); mainWindow.hide(); });
  // mainWindow.on('close', (event) => {
  //   if (!app.isQuitting) { // app.isQuitting is set by tray 'Quit'
  //     event.preventDefault();
  //     mainWindow.hide();
  //   }
  //   return false;
  // });
}

function createTray() {
  // Using a simple data URL for a small colored square as a placeholder icon
  const iconDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAPJJREFUOE+tkj0KwkAQRN9VYlcvYCFYPoKFYLn0BGIpYiiDFZClRCIr2O2vLqAQZBEs3oCIZGT8N2ZGFAUfPsPM7O7M7gCxHSRJAUpKUmVXKzX9JwI9eLhE8CVfpZXrJ8F9nLhE8DGHSSbEjGMEJzG8GJMDBcSnIQjcLhKShPlGfLwCVLpBHAXwD+I6yLgHwBfE1LPNR0X0HwD/EMgLgI8R0Q1kY1kK8J8Q2M4DeA/xPWWYx2QjAA4h2L4BoLPk5lLEe8X0nAA4gJLz/IAj6BT78qKVRf02sT4BNwUuAGsAAAAASUVORK5CYII=';
  const icon = nativeImage.createFromDataURL(iconDataURL);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open App', click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { label: 'Show DevTools', click: () => { if (mainWindow) mainWindow.webContents.openDevTools(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => {
        app.isQuitting = true; // Set a flag to indicate deliberate quit
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Digital Photo Organizer');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      if (mainWindow.isVisible()) mainWindow.focus();
    } else {
      createWindow();
    }
  });
  console.log('System tray icon created.');
}

app.whenReady().then(async () => {
  console.log('App is ready.');
  try {
    console.log('Initializing Database...');
    initializeDatabase();
    console.log('Database initialized.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  try {
    console.log('Loading face recognition models...');
    await loadFaceModels();
    console.log('Face recognition models loaded successfully.');
  } catch (error) {
    console.error('Failed to load face recognition models:', error);
  }

  createWindow();
  createTray(); // Create the tray icon

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      if (!mainWindow) { // Check if mainWindow is null
        createWindow();
      } else {
        mainWindow.show(); // If window exists but is hidden (due to tray interaction)
        mainWindow.focus();
      }
    } else if (mainWindow) { // If there are windows, but mainWindow might be hidden
        mainWindow.show();
        mainWindow.focus();
    }
  });
});

app.on('before-quit', () => { // Handler for when app is quitting
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
});

app.on('window-all-closed', function () {
  // On macOS it's common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q.
  // For tray apps, this behavior is often desired on all platforms.
  // If app.isQuitting is true, it means Quit was selected from tray.
  if (app.isQuitting) {
    app.quit();
  }
  // Otherwise, do nothing, letting the app stay alive in the tray.
  // The original 'if (process.platform !== 'darwin') app.quit();' is removed/modified for tray behavior.
});

// IPC Handlers for core logic - KEEP ALL EXISTING
ipcMain.handle('get-exif-data', async (event, imagePath) => {
  return await extractExifData(imagePath);
});

ipcMain.handle('categorize-by-date', async (event, imagePath) => {
  return await categorizeByDate(imagePath);
});

ipcMain.handle('categorize-by-location', async (event, imagePath) => {
  return await categorizeByLocation(imagePath);
});

ipcMain.handle('get-face-descriptors', async (event, imagePath) => {
  return await getFaceDescriptors(imagePath);
});

ipcMain.handle('get-event-suggestion-data', async (event, imagePath) => {
  return await getEventSuggestionData(imagePath);
});

ipcMain.handle('generate-dhash', async (event, imagePath) => {
  return await generateDHash(imagePath);
});

ipcMain.handle('find-duplicates', async (event, imagePaths, similarityThreshold) => {
  return await findDuplicates(imagePaths, similarityThreshold);
});

ipcMain.handle('calculate-laplacian-variance', async (event, imagePath) => {
  return await calculateLaplacianVariance(imagePath);
});

ipcMain.handle('is-image-blurry', async (event, imagePath, threshold) => {
  return await isImageBlurry(imagePath, threshold);
});

// Example IPC handler for a dialog (add more as needed) - KEEP EXISTING
ipcMain.handle('dialog:openFile', async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!focusedWindow) {
    console.error('dialog:openFile called but no windows are available.');
    return [];
  }
  const { canceled, filePaths } = await dialog.showOpenDialog(focusedWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'] }]
  });
  if (canceled) {
    return [];
  }
  return filePaths;
});

// IPC Handler for opening a directory - KEEP EXISTING
ipcMain.handle('dialog:openDirectory', async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!focusedWindow) {
    console.error('dialog:openDirectory called but no windows are available.');
    return null;
  }
  const { canceled, filePaths } = await dialog.showOpenDialog(focusedWindow, {
    properties: ['openDirectory']
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

// IPC Handler for reading image files in a directory - KEEP EXISTING
ipcMain.handle('fs:readImageFilesInDirectory', async (event, directoryPath) => {
  const fs = require('fs').promises;
  const path = require('path'); // path is already required at the top
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];

  if (!directoryPath) {
    console.error('fs:readImageFilesInDirectory called with no directoryPath');
    return [];
  }

  try {
    const dirents = await fs.readdir(directoryPath, { withFileTypes: true });
    const imageFiles = dirents
      .filter(dirent => dirent.isFile() && imageExtensions.includes(path.extname(dirent.name).toLowerCase()))
      .map(dirent => path.join(directoryPath, dirent.name));
    return imageFiles;
  } catch (error) {
    console.error(`Error reading directory ${directoryPath}:`, error);
    return [];
  }
});

// --- Database IPC Handlers --- KEEP EXISTING
ipcMain.handle('db:addImageRecord', async (event, imageData) => await addImageRecord(imageData));
ipcMain.handle('db:getImageRecordByPath', async (event, imagePath) => await getImageRecordByPath(imagePath));
ipcMain.handle('db:updateImageRecord', async (event, imagePath, updateData) => await updateImageRecord(imagePath, updateData));

// Single, consolidated log message at the end
console.log('Main process (main.js) updated with System Tray, DB initialization, and all IPC handlers.');
