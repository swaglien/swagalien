const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopUpdates', {
  onStatusChange(callback) {
    ipcRenderer.on('update-status', (_event, message) => callback(message));
  },
});