// src/main/electron.js - Complete updated Electron main process
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || /electron(.exe)?$/.test(process.execPath);
// Import the data handler
const ElectronDataHandler = require('./electron-data-handler');

let mainWindow;
let dataHandler;

function createWindow() {
  console.log('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false, // Security: disable node integration
      contextIsolation: true, // Security: enable context isolation
      enableRemoteModule: false, // Security: disable remote module
      preload: path.join(__dirname, 'preload.js'), // Use preload script
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    show: false // Don't show until ready
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on the window
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Load the app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../../build/index.html')}`;
    
  console.log('Loading URL:', startUrl);
  
  mainWindow.loadURL(startUrl);

  // Handle window closed
  mainWindow.on('closed', () => {
    console.log('Main window closed');
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser
    electron.shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external sites
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Allow localhost in development
    if (isDev && parsedUrl.origin === 'http://localhost:3000') {
      return;
    }
    
    // Allow file protocol for production
    if (parsedUrl.protocol === 'file:') {
      return;
    }
    
    // Block all other navigation
    event.preventDefault();
  });

  // Initialize data handler after window is created
  try {
    dataHandler = new ElectronDataHandler();
    console.log('Data handler initialized successfully');
  } catch (error) {
    console.error('Failed to initialize data handler:', error);
  }
}

// App event handlers
app.whenReady().then(() => {
  console.log('Electron app ready, creating window...');
  createWindow();
  
  // macOS specific: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle app before quit
app.on('before-quit', (event) => {
  console.log('App about to quit');
  
  // Add any cleanup logic here if needed
  // For example, save any pending data
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    // Prevent new window creation and open in default browser instead
    event.preventDefault();
    electron.shell.openExternal(navigationUrl);
  });
});

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    console.log('Certificate error in development mode, ignoring:', error);
    event.preventDefault();
    callback(true);
  } else {
    console.log('Certificate error in production:', error);
    callback(false);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // In production, you might want to restart the app or show an error dialog
  if (!isDev) {
    // Show error dialog
    if (mainWindow && !mainWindow.isDestroyed()) {
      electron.dialog.showErrorBox('Unexpected Error', 
        'An unexpected error occurred. The application will continue running, but you may want to restart it.\n\n' + 
        error.message
      );
    }
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at Promise:', promise, 'reason:', reason);
});

// Set app user model ID for Windows
if (process.platform === 'win32') {
  app.setAppUserModelId('com.drawo.app');
}

// Disable hardware acceleration if needed (uncomment if you have rendering issues)
// app.disableHardwareAcceleration();

// Enable live reload for Electron in development
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (error) {
    console.log('electron-reload not available');
  }
}

// Export for testing purposes
module.exports = { mainWindow, dataHandler };