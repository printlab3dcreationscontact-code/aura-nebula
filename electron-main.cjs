const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let serverProcess = null;
let mainWindow = null;
let PORT = 3000;

// =========================================================================
// CONFIGURATION DU DÉPLOIEMENT HYBRIDE (RAILWAY)
// =========================================================================
// Rapprochez votre application de la perfection : si vous l'hébergez sur Railway, 
// écrivez son URL ci-dessous (ex: "https://aura-nebula.up.railway.app").
//
// -> Tout changement poussé sur GitHub sera instantanément actif sur l'app de bureau de vos utilisateurs sans AUCUNE réinstallation requise !
// -> Si laissé vide, l'application fonctionnera à 100% en mode local autonome.
const RAILWAY_URL = "https://aura-nebula-production.up.railway.app"; 

// Function to start the Express/Vite backend server directly in same thread
function startBackendServer() {
  const isProd = app.isPackaged;
  
  // Set NODE_ENV to production inside packaged Electron app
  process.env.NODE_ENV = isProd ? 'production' : 'development';

  console.log(`[Electron-Main] Starting backend server in-process (isProd: ${isProd})`);
  
  try {
    // In both dev and prod, we can require './dist/server.cjs' directly.
    // Electron's require supports loading from inside ASAR archives natively.
    require('./dist/server.cjs');
    console.log(`[Electron-Main] Backend server successfully loaded and running.`);
  } catch (err) {
    console.error('[Electron-Main] CRITICAL: Failed to load backend server in-process:', err);
  }
}

let pollStartTime = Date.now();

// Check with retry if our local web server is fully responsive before displaying window
function pollServer(callback) {
  // Read dynamically on each poll step as the server startups asynchronously!
  if (global.AURA_PORT && global.AURA_PORT !== PORT) {
    PORT = global.AURA_PORT;
    console.log(`[Electron-Main] Dynamic port updated during poll: ${PORT}`);
  }

  // Safe timeout of 4 seconds – if server doesn't respond, we open the window anyway
  if (Date.now() - pollStartTime > 4000) {
    console.warn("[Electron-Main] Server polling timed out. Proceeding to display window...");
    callback(false);
    return;
  }

  const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
    if (res.statusCode === 200) {
      callback(true);
    } else {
      setTimeout(() => pollServer(callback), 150);
    }
  });

  req.on('error', () => {
    setTimeout(() => pollServer(callback), 150);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    title: "Aura Nebula — Grounding AI & Assistant de Recherche",
    backgroundColor: "#050506",
    autoHideMenuBar: true, // Hides standard old-school menu unless Alt is pressed
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Decide whether to load our live Railway URL or our offline Local Host fallback
  const targetUrl = RAILWAY_URL ? RAILWAY_URL.replace(/\/$/, '') : `http://localhost:${PORT}`;
  console.log(`[Electron-Main] Loading window content from target: ${targetUrl}`);
  
  mainWindow.loadURL(targetUrl);

  // Prevent external link clicks from loading inside our app view, open them in local Windows default browser instead!
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isAppUrl = url.startsWith('http://localhost') || 
                     url.startsWith('http://127.0.0.1') || 
                     (RAILWAY_URL && url.startsWith(RAILWAY_URL));
                     
    if (isAppUrl) {
      return { action: 'allow' };
    }
    // Open in standard windows default internet browser (like Chrome, Edge, etc.)
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single Instance lock to prevent multiple windows opening when clicking installer twice
const additionalData = { myKey: 'aura-nebula' };
const gotTheLock = app.requestSingleInstanceLock(additionalData);

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory, additionalData) => {
    // Someone tried to run a second instance, focus our main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // 1. Spawns our local Express + grounding AI backend
    startBackendServer();
    
    // 2. Poll server then open chrome-quality window
    pollServer(() => {
      createWindow();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

// Shutdown background server safely on app exit
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    console.log('[Electron-Main] Shutting down background server...');
    serverProcess.kill();
  }
});
