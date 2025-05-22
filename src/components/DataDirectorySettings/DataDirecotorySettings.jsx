// src/components/DataDirectorySettings/DataDirectorySettings.jsx - Fixed import
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './DataDirectorySettings.module.scss';
import { FolderOpen, Home, Download, Upload, Info, AlertCircle, X } from 'lucide-react';
import { useNotebooks } from '../../hooks/useNotebooks'; // Fixed import

const DataDirectorySettings = ({ onClose }) => {
  const {
    dataDirectoryInfo,
    loadDataDirectoryInfo,
    selectDataDirectory,
    resetToDefaultDirectory,
    exportAllData,
    importData,
    getStorageStats
  } = useNotebooks();

  const [storageStats, setStorageStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  useEffect(() => {
    // Check if functions are available before calling them
    if (loadDataDirectoryInfo) {
      loadDataDirectoryInfo();
    }
    loadStorageStats();
  }, [loadDataDirectoryInfo]);

  // Close on Escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle close button click
  const handleCloseClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("closed");
    onClose();
  };

  const loadStorageStats = async () => {
    if (!getStorageStats) {
      console.log('getStorageStats function not available');
      return;
    }
    
    try {
      const result = await getStorageStats();
      if (result.success) {
        setStorageStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading storage stats:', error);
    }
  };

  const handleSelectDirectory = async () => {
    if (!selectDataDirectory) {
      setMessage({ type: 'error', text: 'Directory selection not available in web version' });
      return;
    }
    
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const result = await selectDataDirectory();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadStorageStats();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToDefault = async () => {
    setShowResetConfirm(true);
  };

  const confirmResetToDefault = async () => {
    setShowResetConfirm(false);
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const result = await resetToDefaultDirectory();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadStorageStats();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const result = await exportAllData();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = async () => {
    setShowImportConfirm(true);
  };

  const confirmImportData = async () => {
    setShowImportConfirm(false);
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const result = await importData();
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadStorageStats();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Data Directory Settings</h2>
          <button 
            className={styles.closeButton} 
            onClick={handleCloseClick}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Show notification for web version */}
          {!selectDataDirectory && (
            <div className={styles.webVersionNotice}>
              <AlertCircle size={20} />
              <span>Data directory management is only available in the desktop version of Drawo.</span>
            </div>
          )}

          {/* Current Directory Info */}
          <div className={styles.section}>
            <h3>
              <FolderOpen className={styles.sectionIcon} />
              Current Data Directory
            </h3>
            <div className={styles.directoryInfo}>
              <code className={styles.directoryPath}>
                {dataDirectoryInfo?.baseDir || 'Local Storage (Web Version)'}
              </code>
              {selectDataDirectory && (
                <div className={styles.directoryActions}>
                  <button
                    className={styles.actionButton}
                    onClick={handleSelectDirectory}
                    disabled={isLoading}
                    type="button"
                  >
                    <FolderOpen size={16} />
                    Change Directory
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={handleResetToDefault}
                    disabled={isLoading}
                    type="button"
                  >
                    <Home size={16} />
                    Reset to Default
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Storage Statistics */}
          {storageStats && (
            <div className={styles.section}>
              <h3>
                <Info className={styles.sectionIcon} />
                Storage Information
              </h3>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Notebooks:</span>
                  <span className={styles.statValue}>{storageStats.notebookCount}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Pages:</span>
                  <span className={styles.statValue}>{storageStats.pageCount}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Total Size:</span>
                  <span className={styles.statValue}>{storageStats.totalSizeMB} MB</span>
                </div>
              </div>
            </div>
          )}

          {/* Import/Export Section */}
          <div className={styles.section}>
            <h3>
              <Download className={styles.sectionIcon} />
              Import/Export Data
            </h3>
            <div className={styles.importExportActions}>
              <button
                className={styles.actionButton}
                onClick={handleExportData}
                disabled={isLoading}
                type="button"
              >
                <Download size={16} />
                Export All Data
              </button>
              <button
                className={styles.actionButton}
                onClick={handleImportData}
                disabled={isLoading}
                type="button"
              >
                <Upload size={16} />
                Import Data
              </button>
            </div>
            <p className={styles.sectionDescription}>
              Export your data for backup or import data from another Drawo installation.
            </p>
          </div>

          {/* Message Display */}
          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.type === 'error' && <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          {/* Information Section */}
          <div className={styles.infoSection}>
            <h4>How Data Directory Works</h4>
            <ul className={styles.infoList}>
              <li>Your notebooks and pages are stored as JSON files in the data directory</li>
              <li>Changing the directory allows you to store data on external drives or custom locations</li>
              <li>The app remembers your directory choice for future sessions</li>
              <li>You can have multiple data directories for different projects</li>
            </ul>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button 
            className={styles.primaryButton} 
            onClick={handleCloseClick}
            type="button"
          >
            Done
          </button>
        </div>

        {/* Confirmation Dialogs */}
        {showResetConfirm && (
          <div className={styles.confirmOverlay} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmDialog}>
              <h3>Reset to Default Directory</h3>
              <p>Are you sure you want to reset to the default data directory? This will not delete your current data.</p>
              <div className={styles.confirmActions}>
                <button 
                  className={styles.cancelButton} 
                  onClick={() => setShowResetConfirm(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button 
                  className={styles.confirmButton} 
                  onClick={confirmResetToDefault}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportConfirm && (
          <div className={styles.confirmOverlay} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmDialog}>
              <h3>Import Data</h3>
              <p>Importing data will add to your existing notebooks. Continue?</p>
              <div className={styles.confirmActions}>
                <button 
                  className={styles.cancelButton} 
                  onClick={() => setShowImportConfirm(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button 
                  className={styles.confirmButton} 
                  onClick={confirmImportData}
                  type="button"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default DataDirectorySettings;