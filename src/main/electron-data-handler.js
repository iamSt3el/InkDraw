
const { ipcMain, dialog, app } = require('electron');
const DataManager = require('../DataManager');
const path = require('path');

class ElectronDataHandler {
  constructor() {
    
    this.initializeDataManager();
    
    
    this.registerHandlers();
  }

  async initializeDataManager() {
    try {
      this.dataManager = await DataManager.createWithUserPreference();
      console.log('DataManager initialized with data directory:', this.dataManager.getDataDirectoryInfo().baseDir);
    } catch (error) {
      console.error('Error initializing DataManager:', error);
      
      this.dataManager = new DataManager();
    }
  }

  registerHandlers() {
    
    ipcMain.handle('data-get-directory-info', async (event) => {
      return {
        success: true,
        directoryInfo: this.dataManager.getDataDirectoryInfo()
      };
    });

    ipcMain.handle('data-select-directory', async (event) => {
      try {
        const result = await dialog.showOpenDialog({
          title: 'Select Data Directory',
          buttonLabel: 'Select Folder',
          properties: ['openDirectory', 'createDirectory'],
          message: 'Choose where to store your notebook data'
        });

        if (!result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0];
          const changeResult = await this.dataManager.changeDataDirectory(selectedPath);
          
          if (changeResult.success) {
            return {
              success: true,
              path: selectedPath,
              message: `Data directory changed to: ${selectedPath}`
            };
          } else {
            return {
              success: false,
              error: changeResult.error
            };
          }
        }

        return {
          success: false,
          error: 'No directory selected'
        };
      } catch (error) {
        console.error('Error selecting data directory:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('data-change-directory', async (event, newPath) => {
      try {
        const result = await this.dataManager.changeDataDirectory(newPath);
        return result;
      } catch (error) {
        console.error('Error changing data directory:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('data-reset-to-default-directory', async (event) => {
      try {
        
        this.dataManager = new DataManager();
        
        
        const preferencesPath = path.join(app.getPath('userData'), 'preferences.json');
        const fs = require('fs').promises;
        try {
          await fs.unlink(preferencesPath);
        } catch (error) {
          
        }
        
        return {
          success: true,
          path: this.dataManager.getDataDirectoryInfo().baseDir,
          message: 'Reset to default data directory'
        };
      } catch (error) {
        console.error('Error resetting to default directory:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    
    ipcMain.handle('data-save-notebook', async (event, notebook) => {
      return await this.dataManager.saveNotebook(notebook);
    });

    ipcMain.handle('data-load-notebook', async (event, notebookId) => {
      return await this.dataManager.loadNotebook(notebookId);
    });

    ipcMain.handle('data-load-all-notebooks', async (event) => {
      return await this.dataManager.loadAllNotebooks();
    });

    ipcMain.handle('data-delete-notebook', async (event, notebookId) => {
      return await this.dataManager.deleteNotebook(notebookId);
    });

    
    ipcMain.handle('data-save-page', async (event, pageData) => {
      return await this.dataManager.savePage(pageData);
    });

    ipcMain.handle('data-load-page', async (event, pageId) => {
      return await this.dataManager.loadPage(pageId);
    });

    ipcMain.handle('data-load-pages-by-notebook', async (event, notebookId) => {
      return await this.dataManager.loadPagesByNotebook(notebookId);
    });

    ipcMain.handle('data-delete-page', async (event, pageId) => {
      return await this.dataManager.deletePage(pageId);
    });

    
    ipcMain.handle('data-save-app-settings', async (event, settings) => {
      return await this.dataManager.saveAppSettings(settings);
    });

    ipcMain.handle('data-load-app-settings', async (event) => {
      return await this.dataManager.loadAppSettings();
    });

    
    ipcMain.handle('data-create-backup', async (event) => {
      return await this.dataManager.createBackup();
    });

    ipcMain.handle('data-get-storage-stats', async (event) => {
      return await this.dataManager.getStorageStats();
    });

    
    ipcMain.handle('data-export-all-data', async (event) => {
      try {
        const result = await dialog.showSaveDialog({
          title: 'Export All Data',
          defaultPath: `drawo-export-${new Date().toISOString().slice(0, 10)}.json`,
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (!result.canceled && result.filePath) {
          
          const notebooksResult = await this.dataManager.loadAllNotebooks();
          if (!notebooksResult.success) {
            throw new Error('Failed to load notebooks for export');
          }

          const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            notebooks: [],
            pages: {}
          };

          
          for (const notebook of notebooksResult.notebooks) {
            exportData.notebooks.push(notebook);
            
            
            const pagesResult = await this.dataManager.loadPagesByNotebook(notebook.id);
            if (pagesResult.success) {
              exportData.pages[notebook.id] = pagesResult.pages;
            }
          }

          
          const fs = require('fs').promises;
          await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2));

          return {
            success: true,
            path: result.filePath,
            message: 'Data exported successfully'
          };
        }

        return {
          success: false,
          error: 'Export cancelled'
        };
      } catch (error) {
        console.error('Error exporting data:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    ipcMain.handle('data-import-data', async (event) => {
      try {
        const result = await dialog.showOpenDialog({
          title: 'Import Data',
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          const fs = require('fs').promises;
          
          
          const fileContent = await fs.readFile(filePath, 'utf8');
          const importData = JSON.parse(fileContent);

          
          if (!importData.notebooks || !Array.isArray(importData.notebooks)) {
            throw new Error('Invalid import file format');
          }

          let importedNotebooks = 0;
          let importedPages = 0;

          
          for (const notebook of importData.notebooks) {
            try {
              await this.dataManager.saveNotebook(notebook);
              importedNotebooks++;
            } catch (error) {
              console.error(`Error importing notebook ${notebook.id}:`, error);
            }
          }

          
          if (importData.pages) {
            for (const [notebookId, pages] of Object.entries(importData.pages)) {
              if (Array.isArray(pages)) {
                for (const page of pages) {
                  try {
                    await this.dataManager.savePage(page);
                    importedPages++;
                  } catch (error) {
                    console.error(`Error importing page ${page.id}:`, error);
                  }
                }
              }
            }
          }

          return {
            success: true,
            message: `Imported ${importedNotebooks} notebooks and ${importedPages} pages`,
            imported: {
              notebooks: importedNotebooks,
              pages: importedPages
            }
          };
        }

        return {
          success: false,
          error: 'Import cancelled'
        };
      } catch (error) {
        console.error('Error importing data:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }
}

module.exports = ElectronDataHandler;