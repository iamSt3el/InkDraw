// src/services/ElectronService.js - Updated for secure IPC
class ElectronService {
    constructor() {
      this.isElectron = this.checkElectron();
      this.api = this.isElectron ? window.electronAPI : null;
    }
  
    checkElectron() {
      // Check if running in Electron with the secure API
      return typeof window !== 'undefined' && window.electronAPI && window.electronAPI.isElectron;
    }
  
    async invoke(method, ...args) {
      if (this.isElectron && this.api && this.api[method]) {
        try {
          console.log(`ElectronService: Calling ${method} with args:`, args);
          const result = await this.api[method](...args);
          console.log(`ElectronService: ${method} result:`, result);
          return result;
        } catch (error) {
          console.error(`ElectronService: Error calling ${method}:`, error);
          return { success: false, error: error.message };
        }
      } else {
        // Fallback for web version
        console.warn(`Electron not available or method ${method} not found, running in web mode`);
        return { success: false, error: 'Electron not available' };
      }
    }
  
    // Notebook operations
    async saveNotebook(notebook) {
      return await this.invoke('saveNotebook', notebook);
    }
  
    async loadNotebook(notebookId) {
      return await this.invoke('loadNotebook', notebookId);
    }
  
    async loadAllNotebooks() {
      return await this.invoke('loadAllNotebooks');
    }
  
    async deleteNotebook(notebookId) {
      return await this.invoke('deleteNotebook', notebookId);
    }
  
    // Page operations
    async savePage(pageData) {
      return await this.invoke('savePage', pageData);
    }
  
    async loadPage(pageId) {
      return await this.invoke('loadPage', pageId);
    }
  
    async loadPagesByNotebook(notebookId) {
      return await this.invoke('loadPagesByNotebook', notebookId);
    }
  
    async deletePage(pageId) {
      return await this.invoke('deletePage', pageId);
    }
  
    // Settings operations
    async saveAppSettings(settings) {
      return await this.invoke('saveAppSettings', settings);
    }
  
    async loadAppSettings() {
      return await this.invoke('loadAppSettings');
    }
  
    // Data directory operations
    async getDirectoryInfo() {
      return await this.invoke('getDirectoryInfo');
    }
  
    async selectDirectory() {
      return await this.invoke('selectDirectory');
    }
  
    async changeDirectory(newPath) {
      return await this.invoke('changeDirectory', newPath);
    }
  
    async resetToDefaultDirectory() {
      return await this.invoke('resetToDefaultDirectory');
    }
  
    // Utility operations
    async createBackup() {
      return await this.invoke('createBackup');
    }
  
    async getStorageStats() {
      return await this.invoke('getStorageStats');
    }
  
    async exportAllData() {
      return await this.invoke('exportAllData');
    }
  
    async importData() {
      return await this.invoke('importData');
    }
  }
  
  // Create singleton instance
  const electronService = new ElectronService();
  export default electronService;