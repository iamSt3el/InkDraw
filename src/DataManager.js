// data/DataManager.js - Updated with dynamic data directory support
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class DataManager {
  constructor(baseDir = null) {
    // If no baseDir provided, use user data directory
    this.baseDir = baseDir || this.getDefaultDataDirectory();
    this.notebooksDir = path.join(this.baseDir, 'notebooks');
    this.pagesDir = path.join(this.baseDir, 'pages');
    this.settingsDir = path.join(this.baseDir, 'settings');
    
    // Initialize directories on startup
    this.init();
  }

  // Get default data directory based on platform
  getDefaultDataDirectory() {
    try {
      // Use Electron's app.getPath for user data
      return path.join(app.getPath('userData'), 'DrawoData');
    } catch (error) {
      // Fallback for non-Electron environments
      const os = require('os');
      return path.join(os.homedir(), '.drawo-data');
    }
  }

  // Change data directory (for user-selected directories)
  async changeDataDirectory(newBaseDir) {
    try {
      // Validate the new directory
      await fs.access(newBaseDir);
      
      // Update paths
      this.baseDir = newBaseDir;
      this.notebooksDir = path.join(this.baseDir, 'notebooks');
      this.pagesDir = path.join(this.baseDir, 'pages');
      this.settingsDir = path.join(this.baseDir, 'settings');
      
      // Initialize new directories
      await this.init();
      
      // Save the new path to settings
      await this.saveDataDirectoryPreference(newBaseDir);
      
      return { success: true, path: newBaseDir };
    } catch (error) {
      console.error('Error changing data directory:', error);
      return { success: false, error: error.message };
    }
  }

  // Save user's data directory preference
  async saveDataDirectoryPreference(dataDir) {
    try {
      const preferencesPath = path.join(app.getPath('userData'), 'preferences.json');
      const preferences = {
        dataDirectory: dataDir,
        lastModified: new Date().toISOString()
      };
      await fs.writeFile(preferencesPath, JSON.stringify(preferences, null, 2));
    } catch (error) {
      console.error('Error saving data directory preference:', error);
    }
  }

  // Load user's data directory preference
  async loadDataDirectoryPreference() {
    try {
      const preferencesPath = path.join(app.getPath('userData'), 'preferences.json');
      const data = await fs.readFile(preferencesPath, 'utf8');
      const preferences = JSON.parse(data);
      return preferences.dataDirectory;
    } catch (error) {
      // If no preference file exists, return null
      return null;
    }
  }

  // Initialize required directories
  async init() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(this.notebooksDir, { recursive: true });
      await fs.mkdir(this.pagesDir, { recursive: true });
      await fs.mkdir(this.settingsDir, { recursive: true });
      
      console.log(`Data directories initialized at: ${this.baseDir}`);
    } catch (error) {
      console.error('Error initializing directories:', error);
      throw error;
    }
  }

  // Get current data directory info
  getDataDirectoryInfo() {
    return {
      baseDir: this.baseDir,
      notebooksDir: this.notebooksDir,
      pagesDir: this.pagesDir,
      settingsDir: this.settingsDir
    };
  }

  // NOTEBOOK FUNCTIONS
  
  // Save a notebook
  async saveNotebook(notebook) {
    try {
      const filePath = path.join(this.notebooksDir, `${notebook.id}.json`);
      const notebookData = {
        ...notebook,
        lastModified: new Date().toISOString(),
        pages: notebook.pages || [], // Array of page IDs
        totalPages: notebook.totalPages || notebook.pages || 100 // Store the pages limit
      };
      await fs.writeFile(filePath, JSON.stringify(notebookData, null, 2));
      return { success: true, notebook: notebookData };
    } catch (error) {
      console.error('Error saving notebook:', error);
      return { success: false, error: error.message };
    }
  }

  // Load a notebook by ID
  async loadNotebook(notebookId) {
    try {
      const filePath = path.join(this.notebooksDir, `${notebookId}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, notebook: JSON.parse(data) };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: false, error: 'Notebook not found' };
      }
      console.error('Error loading notebook:', error);
      return { success: false, error: error.message };
    }
  }

  // Load all notebooks
  async loadAllNotebooks() {
    try {
      const files = await fs.readdir(this.notebooksDir);
      const notebooks = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.notebooksDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          notebooks.push(JSON.parse(data));
        }
      }
      
      // Sort by creation date (newest first)
      notebooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { success: true, notebooks };
    } catch (error) {
      console.error('Error loading notebooks:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete a notebook and all its pages
  async deleteNotebook(notebookId) {
    try {
      // First, load the notebook to get its pages
      const notebookResult = await this.loadNotebook(notebookId);
      if (!notebookResult.success) {
        return notebookResult;
      }

      const notebook = notebookResult.notebook;
      
      // Delete all pages belonging to this notebook
      if (notebook.pages && notebook.pages.length > 0) {
        for (const pageId of notebook.pages) {
          await this.deletePage(pageId);
        }
      }

      // Delete the notebook file
      const filePath = path.join(this.notebooksDir, `${notebookId}.json`);
      await fs.unlink(filePath);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting notebook:', error);
      return { success: false, error: error.message };
    }
  }

  // PAGE FUNCTIONS
  
  // Save a page with improved settings handling
  async savePage(pageData) {
    try {
      const { notebookId, pageNumber, canvasData, settings, ...otherData } = pageData;
      const pageId = `${notebookId}_page_${pageNumber}`;
      
      console.log('DataManager saving page:', pageId, 'with settings:', settings);
      
      // If settings are not provided, try to load existing settings from the file
      let finalSettings = settings;
      
      if (!settings) {
        console.log('No settings provided, attempting to preserve existing settings...');
        try {
          const existingPageResult = await this.loadPage(pageId);
          if (existingPageResult.success && existingPageResult.page.settings) {
            finalSettings = existingPageResult.page.settings;
            console.log('Preserved existing settings:', finalSettings);
          } else {
            // Use default settings if no existing settings found
            finalSettings = {
              pattern: 'grid',
              patternSize: 20,
              patternColor: '#e5e7eb',
              patternOpacity: 50
            };
            console.log('Using default settings:', finalSettings);
          }
        } catch (loadError) {
          console.log('No existing page found, using default settings');
          finalSettings = {
            pattern: 'grid',
            patternSize: 20,
            patternColor: '#e5e7eb',
            patternOpacity: 50
          };
        }
      }

      console.log('Final settings being saved:', finalSettings);

      const page = {
        id: pageId,
        notebookId,
        pageNumber,
        canvasData,
        settings: finalSettings,
        lastModified: new Date().toISOString(),
        ...otherData
      };

      const filePath = path.join(this.pagesDir, `${pageId}.json`);
      await fs.writeFile(filePath, JSON.stringify(page, null, 2));
      
      // Update notebook's pages array
      await this.addPageToNotebook(notebookId, pageId);
      
      console.log('Page saved successfully with final settings:', finalSettings);
      return { success: true, page };
    } catch (error) {
      console.error('Error saving page:', error);
      return { success: false, error: error.message };
    }
  }

  // Load a page by ID
  async loadPage(pageId) {
    try {
      const filePath = path.join(this.pagesDir, `${pageId}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, page: JSON.parse(data) };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: false, error: 'Page not found' };
      }
      console.error('Error loading page:', error);
      return { success: false, error: error.message };
    }
  }

  // Load pages by notebook ID
  async loadPagesByNotebook(notebookId) {
    try {
      const notebookResult = await this.loadNotebook(notebookId);
      if (!notebookResult.success) {
        return notebookResult;
      }

      const notebook = notebookResult.notebook;
      const pages = [];

      if (notebook.pages && notebook.pages.length > 0) {
        for (const pageId of notebook.pages) {
          const pageResult = await this.loadPage(pageId);
          if (pageResult.success) {
            pages.push(pageResult.page);
          }
        }
      }

      // Sort pages by page number
      pages.sort((a, b) => a.pageNumber - b.pageNumber);

      return { success: true, pages };
    } catch (error) {
      console.error('Error loading pages:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete a page
  async deletePage(pageId) {
    try {
      const filePath = path.join(this.pagesDir, `${pageId}.json`);
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting page:', error);
      return { success: false, error: error.message };
    }
  }

  // Add page to notebook's pages array
  async addPageToNotebook(notebookId, pageId) {
    try {
      const notebookResult = await this.loadNotebook(notebookId);
      if (!notebookResult.success) {
        return notebookResult;
      }

      const notebook = notebookResult.notebook;
      if (!notebook.pages) {
        notebook.pages = [];
      }

      // Add page if not already present
      if (!notebook.pages.includes(pageId)) {
        notebook.pages.push(pageId);
        await this.saveNotebook(notebook);
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding page to notebook:', error);
      return { success: false, error: error.message };
    }
  }

  // SETTINGS FUNCTIONS
  
  // Save global app settings
  async saveAppSettings(settings) {
    try {
      const filePath = path.join(this.settingsDir, 'app-settings.json');
      const appSettings = {
        ...settings,
        lastModified: new Date().toISOString()
      };
      await fs.writeFile(filePath, JSON.stringify(appSettings, null, 2));
      return { success: true, settings: appSettings };
    } catch (error) {
      console.error('Error saving app settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Load global app settings
  async loadAppSettings() {
    try {
      const filePath = path.join(this.settingsDir, 'app-settings.json');
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, settings: JSON.parse(data) };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Return default settings if file doesn't exist
        const defaultSettings = {
          theme: 'light',
          defaultPenSettings: {
            color: '#000000',
            strokeWidth: 5,
            opacity: 100
          },
          defaultPageSettings: {
            pattern: 'grid',
            patternSize: 20,
            patternColor: '#e5e7eb',
            patternOpacity: 50
          }
        };
        return { success: true, settings: defaultSettings };
      }
      console.error('Error loading app settings:', error);
      return { success: false, error: error.message };
    }
  }

  // UTILITY FUNCTIONS
  
  // Backup all data
  async createBackup() {
    try {
      const backupDir = path.join(this.baseDir, 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `backup-${timestamp}`);
      
      // Copy all directories to backup
      await this.copyDirectory(this.notebooksDir, path.join(backupPath, 'notebooks'));
      await this.copyDirectory(this.pagesDir, path.join(backupPath, 'pages'));
      await this.copyDirectory(this.settingsDir, path.join(backupPath, 'settings'));
      
      return { success: true, backupPath };
    } catch (error) {
      console.error('Error creating backup:', error);
      return { success: false, error: error.message };
    }
  }

  // Copy directory recursively
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(src);
    
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = await fs.stat(srcPath);
      
      if (stat.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  // Get storage statistics
  async getStorageStats() {
    try {
      const notebookFiles = await fs.readdir(this.notebooksDir);
      const pageFiles = await fs.readdir(this.pagesDir);
      
      let totalSize = 0;
      
      // Calculate total size of notebook files
      for (const file of notebookFiles) {
        if (file.endsWith('.json')) {
          const stat = await fs.stat(path.join(this.notebooksDir, file));
          totalSize += stat.size;
        }
      }
      
      // Calculate total size of page files
      for (const file of pageFiles) {
        if (file.endsWith('.json')) {
          const stat = await fs.stat(path.join(this.pagesDir, file));
          totalSize += stat.size;
        }
      }
      
      return {
        success: true,
        stats: {
          notebookCount: notebookFiles.filter(f => f.endsWith('.json')).length,
          pageCount: pageFiles.filter(f => f.endsWith('.json')).length,
          totalSizeBytes: totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          dataDirectory: this.baseDir
        }
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Static method to create DataManager with user preference
  static async createWithUserPreference() {
    try {
      const tempManager = new DataManager();
      const preferredPath = await tempManager.loadDataDirectoryPreference();
      
      if (preferredPath) {
        // Check if the preferred path still exists
        try {
          await fs.access(preferredPath);
          console.log(`Using user-preferred data directory: ${preferredPath}`);
          return new DataManager(preferredPath);
        } catch (error) {
          console.log(`Preferred path ${preferredPath} not accessible, using default`);
        }
      }
      
      // Use default path
      console.log(`Using default data directory: ${tempManager.baseDir}`);
      return tempManager;
    } catch (error) {
      console.error('Error creating DataManager with user preference:', error);
      return new DataManager();
    }
  }
}

module.exports = DataManager;