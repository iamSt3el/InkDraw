// src/hooks/useNotebooks.js - Hook for data directory operations
import { useState, useEffect } from 'react';
import electronService from '../services/ElectronService';

export const useNotebooks = () => {
  const [dataDirectoryInfo, setDataDirectoryInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load data directory info on mount
  useEffect(() => {
    loadDataDirectoryInfo();
  }, []);

  const loadDataDirectoryInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (electronService.isElectron) {
        const result = await electronService.getDirectoryInfo();
        if (result.success) {
          setDataDirectoryInfo(result.directoryInfo);
        } else {
          throw new Error(result.error || 'Failed to load directory info');
        }
      } else {
        // Web version - set dummy data
        setDataDirectoryInfo({
          baseDir: 'Local Storage (Web Version)',
          notebooksDir: 'localStorage',
          pagesDir: 'localStorage',
          settingsDir: 'localStorage'
        });
      }
    } catch (err) {
      console.error('Error loading data directory info:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectDataDirectory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!electronService.isElectron) {
        return {
          success: false,
          error: 'Data directory selection is only available in the desktop version'
        };
      }
      
      const result = await electronService.selectDirectory();
      
      if (result.success) {
        // Reload directory info after successful change
        await loadDataDirectoryInfo();
        return {
          success: true,
          message: result.message || 'Directory changed successfully'
        };
      } else {
        return result;
      }
    } catch (err) {
      console.error('Error selecting data directory:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaultDirectory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!electronService.isElectron) {
        return {
          success: false,
          error: 'Data directory reset is only available in the desktop version'
        };
      }
      
      const result = await electronService.resetToDefaultDirectory();
      
      if (result.success) {
        // Reload directory info after successful reset
        await loadDataDirectoryInfo();
        return {
          success: true,
          message: result.message || 'Reset to default directory successfully'
        };
      } else {
        return result;
      }
    } catch (err) {
      console.error('Error resetting data directory:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  const exportAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await electronService.exportAllData();
      
      if (result.success) {
        return {
          success: true,
          message: result.message || 'Data exported successfully'
        };
      } else {
        return result;
      }
    } catch (err) {
      console.error('Error exporting data:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  const importData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await electronService.importData();
      
      if (result.success) {
        return {
          success: true,
          message: result.message || 'Data imported successfully'
        };
      } else {
        return result;
      }
    } catch (err) {
      console.error('Error importing data:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  const getStorageStats = async () => {
    try {
      const result = await electronService.getStorageStats();
      return result;
    } catch (err) {
      console.error('Error getting storage stats:', err);
      return {
        success: false,
        error: err.message
      };
    }
  };

  const createBackup = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await electronService.createBackup();
      
      if (result.success) {
        return {
          success: true,
          message: 'Backup created successfully',
          path: result.backupPath
        };
      } else {
        return result;
      }
    } catch (err) {
      console.error('Error creating backup:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // State
    dataDirectoryInfo,
    isLoading,
    error,
    
    // Methods
    loadDataDirectoryInfo,
    selectDataDirectory,
    resetToDefaultDirectory,
    exportAllData,
    importData,
    getStorageStats,
    createBackup
  };
};