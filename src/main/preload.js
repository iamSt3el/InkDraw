
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  
  saveNotebook: (notebook) => ipcRenderer.invoke('data-save-notebook', notebook),
  loadNotebook: (notebookId) => ipcRenderer.invoke('data-load-notebook', notebookId),
  loadAllNotebooks: () => ipcRenderer.invoke('data-load-all-notebooks'),
  deleteNotebook: (notebookId) => ipcRenderer.invoke('data-delete-notebook', notebookId),

  
  savePage: (pageData) => ipcRenderer.invoke('data-save-page', pageData),
  loadPage: (pageId) => ipcRenderer.invoke('data-load-page', pageId),
  loadPagesByNotebook: (notebookId) => ipcRenderer.invoke('data-load-pages-by-notebook', notebookId),
  deletePage: (pageId) => ipcRenderer.invoke('data-delete-page', pageId),

  
  saveAppSettings: (settings) => ipcRenderer.invoke('data-save-app-settings', settings),
  loadAppSettings: () => ipcRenderer.invoke('data-load-app-settings'),

  
  getDirectoryInfo: () => ipcRenderer.invoke('data-get-directory-info'),
  selectDirectory: () => ipcRenderer.invoke('data-select-directory'),
  changeDirectory: (newPath) => ipcRenderer.invoke('data-change-directory', newPath),
  resetToDefaultDirectory: () => ipcRenderer.invoke('data-reset-to-default-directory'),

  
  createBackup: () => ipcRenderer.invoke('data-create-backup'),
  getStorageStats: () => ipcRenderer.invoke('data-get-storage-stats'),
  exportAllData: () => ipcRenderer.invoke('data-export-all-data'),
  importData: () => ipcRenderer.invoke('data-import-data'),

  
  isElectron: true
});