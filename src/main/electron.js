
const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || /electron(.exe)?$/.test(process.execPath);

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
    frame: false,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false, 
      contextIsolation: true, 
      enableRemoteModule: false, 
      preload: path.join(__dirname, 'preload.js'), 
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    show: false 
  });

  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file:
    
  console.log('Loading URL:', startUrl);
  
  mainWindow.loadURL(startUrl);

  
  mainWindow.on('closed', () => {
    console.log('Main window closed');
    mainWindow = null;
  });

  
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    
    electron.shell.openExternal(url);
    return { action: 'deny' };
  });

  
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    
    if (isDev && parsedUrl.origin === 'http://localhost:3000') {
      return;
    }
    
    
    if (parsedUrl.protocol === 'file:') {
      return;
    }
    
    
    event.preventDefault();
  });

  
  try {
    dataHandler = new ElectronDataHandler();
    console.log('Data handler initialized successfully');
  } catch (error) {
    console.error('Failed to initialize data handler:', error);
  }
}

app.whenReady().then(() => {
  console.log('Electron app ready, creating window...');
  createWindow();
  
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  
  
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', (event) => {
  console.log('App about to quit');
  
  
  
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    
    event.preventDefault();
    electron.shell.openExternal(navigationUrl);
  });
});

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

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  
  if (!isDev) {
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      electron.dialog.showErrorBox('Unexpected Error', 
        'An unexpected error occurred. The application will continue running, but you may want to restart it.\n\n' + 
        error.message
      );
    }
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at Promise:', promise, 'reason:', reason);
});

if (process.platform === 'win32') {
  app.setAppUserModelId('com.drawo.app');
}

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

module.exports = { mainWindow, dataHandler };