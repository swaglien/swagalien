const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function configureAutoUpdates(window) {
  if (!app.isPackaged) return;

  autoUpdater.on('update-downloaded', () => {
    window.webContents.send('update-status', 'Update downloaded. It will install when you close the app.');
  });

  autoUpdater.on('error', () => {
    window.webContents.send('update-status', 'Updates are temporarily unavailable.');
  });

  autoUpdater.checkForUpdates().catch(() => {
    window.webContents.send('update-status', 'Updates are temporarily unavailable.');
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    title: 'Nutrition Tracker',
    backgroundColor: '#f3f7ff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  window.loadFile(path.join(__dirname, 'index.html'), {
    query: { desktop: '1' },
  });
  configureAutoUpdates(window);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});