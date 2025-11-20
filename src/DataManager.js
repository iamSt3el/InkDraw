
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class DataManager {
  constructor(baseDir = null) {
    
    this.baseDir = baseDir || this.getDefaultDataDirectory();
    this.notebooksDir = path.join(this.baseDir, 'notebooks');
    this.pagesDir = path.join(this.baseDir, 'pages');
    this.settingsDir = path.join(this.baseDir, 'settings');
    
    
    this.init();
  }

  
  getDefaultDataDirectory() {
    try {
      
      return path.join(app.getPath('userData'), 'DrawoData');
    } catch (error) {
      
      const os = require('os');
      return path.join(os.homedir(), '.drawo-data');
    }
  }

  
  async changeDataDirectory(newBaseDir) {
    try {
      
      await fs.access(newBaseDir);
      
      
      this.baseDir = newBaseDir;
      this.notebooksDir = path.join(this.baseDir, 'notebooks');
      this.pagesDir = path.join(this.baseDir, 'pages');
      this.settingsDir = path.join(this.baseDir, 'settings');
      
      
      await this.init();
      
      
      await this.saveDataDirectoryPreference(newBaseDir);
      
      return { success: true, path: newBaseDir };
    } catch (error) {
      console.error('Error changing data directory:', error);
      return { success: false, error: error.message };
    }
  }

  
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

  
  async loadDataDirectoryPreference() {
    try {
      const preferencesPath = path.join(app.getPath('userData'), 'preferences.json');
      const data = await fs.readFile(preferencesPath, 'utf8');
      const preferences = JSON.parse(data);
      return preferences.dataDirectory;
    } catch (error) {
      
      return null;
    }
  }

  
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

  
  getDataDirectoryInfo() {
    return {
      baseDir: this.baseDir,
      notebooksDir: this.notebooksDir,
      pagesDir: this.pagesDir,
      settingsDir: this.settingsDir
    };
  }

  
  
  
  async saveNotebook(notebook) {
    try {
      const filePath = path.join(this.notebooksDir, `${notebook.id}.json`);
      const notebookData = {
        ...notebook,
        lastModified: new Date().toISOString(),
        pages: notebook.pages || [], 
        totalPages: notebook.totalPages || notebook.pages || 100 
      };
      await fs.writeFile(filePath, JSON.stringify(notebookData, null, 2));
      return { success: true, notebook: notebookData };
    } catch (error) {
      console.error('Error saving notebook:', error);
      return { success: false, error: error.message };
    }
  }

  
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
      
      
      notebooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { success: true, notebooks };
    } catch (error) {
      console.error('Error loading notebooks:', error);
      return { success: false, error: error.message };
    }
  }

  
  async deleteNotebook(notebookId) {
    try {
      
      const notebookResult = await this.loadNotebook(notebookId);
      if (!notebookResult.success) {
        return notebookResult;
      }

      const notebook = notebookResult.notebook;
      
      
      if (notebook.pages && notebook.pages.length > 0) {
        for (const pageId of notebook.pages) {
          await this.deletePage(pageId);
        }
      }

      
      const filePath = path.join(this.notebooksDir, `${notebookId}.json`);
      await fs.unlink(filePath);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting notebook:', error);
      return { success: false, error: error.message };
    }
  }

  
  
  
  async savePage(pageData) {
    try {
      const { notebookId, pageNumber, canvasData, settings, ...otherData } = pageData;
      const pageId = `${notebookId}_page_${pageNumber}`;
      
      console.log('DataManager saving page:', pageId, 'with settings:', settings);
      
      
      let finalSettings = settings;
      
      if (!settings) {
        console.log('No settings provided, attempting to preserve existing settings...');
        try {
          const existingPageResult = await this.loadPage(pageId);
          if (existingPageResult.success && existingPageResult.page.settings) {
            finalSettings = existingPageResult.page.settings;
            console.log('Preserved existing settings:', finalSettings);
          } else {
            
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
      
      
      await this.addPageToNotebook(notebookId, pageId);
      
      console.log('Page saved successfully with final settings:', finalSettings);
      return { success: true, page };
    } catch (error) {
      console.error('Error saving page:', error);
      return { success: false, error: error.message };
    }
  }

  
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

      
      pages.sort((a, b) => a.pageNumber - b.pageNumber);

      return { success: true, pages };
    } catch (error) {
      console.error('Error loading pages:', error);
      return { success: false, error: error.message };
    }
  }

  
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

  
  async loadAppSettings() {
    try {
      const filePath = path.join(this.settingsDir, 'app-settings.json');
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, settings: JSON.parse(data) };
    } catch (error) {
      if (error.code === 'ENOENT') {
        
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

  
  
  
  async createBackup() {
    try {
      const backupDir = path.join(this.baseDir, 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `backup-${timestamp}`);
      
      
      await this.copyDirectory(this.notebooksDir, path.join(backupPath, 'notebooks'));
      await this.copyDirectory(this.pagesDir, path.join(backupPath, 'pages'));
      await this.copyDirectory(this.settingsDir, path.join(backupPath, 'settings'));
      
      return { success: true, backupPath };
    } catch (error) {
      console.error('Error creating backup:', error);
      return { success: false, error: error.message };
    }
  }

  
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

  
  async getStorageStats() {
    try {
      const notebookFiles = await fs.readdir(this.notebooksDir);
      const pageFiles = await fs.readdir(this.pagesDir);
      
      let totalSize = 0;
      
      
      for (const file of notebookFiles) {
        if (file.endsWith('.json')) {
          const stat = await fs.stat(path.join(this.notebooksDir, file));
          totalSize += stat.size;
        }
      }
      
      
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

  
  static async createWithUserPreference() {
    try {
      const tempManager = new DataManager();
      const preferredPath = await tempManager.loadDataDirectoryPreference();
      
      if (preferredPath) {
        
        try {
          await fs.access(preferredPath);
          console.log(`Using user-preferred data directory: ${preferredPath}`);
          return new DataManager(preferredPath);
        } catch (error) {
          console.log(`Preferred path ${preferredPath} not accessible, using default`);
        }
      }
      
      
      console.log(`Using default data directory: ${tempManager.baseDir}`);
      return tempManager;
    } catch (error) {
      console.error('Error creating DataManager with user preference:', error);
      return new DataManager();
    }
  }
}

module.exports = DataManager;