// src/pages/NotebookInside/Index.jsx - FIXED VERSION
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './NotebookInside.module.scss';
import ToolBar from '../../components/ToolBar/Index';
import NoteBookUi from '../../components/NotebookUi/Index';
import PageSettingPanel from '../../components/PagePanel/PagePanel';
import PenSettingPanel from '../../components/PenPanel/PenPanel';
import PageNavigator from '../../components/PageNavigator/PageNavigator';
import { useDrawingStore } from '../../stores/drawingStore';
import { useNotebookStore } from '../../stores/noteBookStore';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';

const NotebookInside = () => {
  const navigate = useNavigate();
  const { notebookId, pageNumber } = useParams();
  
  const { 
    currentTool, 
    canvasData, 
    pageSettings, 
    markChangesSaved, 
    getCurrentCanvasData,
    forceUpdateCanvasData 
  } = useDrawingStore();
  
  const { 
    notebooks, 
    currentNotebook, 
    setCurrentNotebook,
    updateNotebookProgress 
  } = useNotebookStore();
  
  const { 
    currentPageData, 
    loadPage, 
    savePage, 
    isSaving,
    isLoading,
    setSaving 
  } = usePageStore();

  const { showNotification } = useUIStore();

  const [currentPageNumber, setCurrentPageNumber] = useState(parseInt(pageNumber) || 1);
  const [notebook, setNotebook] = useState(null);
  const [autoSaveInterval, setAutoSaveInterval] = useState(null);
  const [lastSavedData, setLastSavedData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Initialize notebook
  useEffect(() => {
    const initializeNotebook = async () => {
      console.log('NotebookInside: Initializing with notebookId:', notebookId);
      
      if (!notebookId) {
        console.error('No notebook ID provided');
        navigate('/');
        return;
      }

      // Find notebook in store or set current
      let foundNotebook = notebooks.find(nb => nb.id === notebookId);
      
      if (!foundNotebook && currentNotebook?.id === notebookId) {
        foundNotebook = currentNotebook;
      }
      
      if (!foundNotebook) {
        console.error('Notebook not found:', notebookId);
        // Redirect to notebook manager
        navigate('/');
        return;
      }

      setNotebook(foundNotebook);
      setCurrentNotebook(notebookId);
      
      console.log('NotebookInside: Initialized notebook:', foundNotebook.title);
    };

    initializeNotebook();
  }, [notebookId, notebooks, currentNotebook, setCurrentNotebook, navigate]);

  // Handle URL page parameter changes
  useEffect(() => {
    const urlPageNumber = parseInt(pageNumber) || 1;
    if (urlPageNumber !== currentPageNumber) {
      setCurrentPageNumber(urlPageNumber);
    }
  }, [pageNumber, currentPageNumber]);

  // Load page data when page number changes
  useEffect(() => {
    const loadCurrentPage = async () => {
      if (!notebookId || !currentPageNumber) return;
      
      console.log(`=== LOADING PAGE ${currentPageNumber} ===`);
      console.log('NotebookID:', notebookId);
      
      try {
        const result = await loadPage(notebookId, currentPageNumber);
        if (result.success) {
          console.log('Page loaded successfully:', {
            pageId: result.page.id,
            hasCanvasData: !!result.page.canvasData,
            canvasDataLength: result.page.canvasData?.length || 0,
            hasSettings: !!result.page.settings
          });
          
          setLastSavedData(result.page.canvasData);
          setHasUnsavedChanges(false);
          setIsInitialLoad(false);
        } else {
          console.error('Failed to load page:', result.error);
        }
      } catch (error) {
        console.error('Error loading page:', error);
      }
    };

    loadCurrentPage();
  }, [notebookId, currentPageNumber, loadPage]);

  // FIXED: Better change detection using fresh canvas data
  useEffect(() => {
    if (isInitialLoad) return; // Skip change detection during initial load
    
    const checkForChanges = () => {
      // Get fresh canvas data directly from engine
      if (getCurrentCanvasData) {
        const freshCanvasData = getCurrentCanvasData();
        
        if (freshCanvasData && lastSavedData && freshCanvasData !== lastSavedData) {
          console.log('Canvas changes detected via fresh data check');
          setHasUnsavedChanges(true);
        }
      } else {
        // Fallback to store data
        if (canvasData && lastSavedData && canvasData !== lastSavedData) {
          console.log('Canvas changes detected via store data');
          setHasUnsavedChanges(true);
        }
      }
    };

    // Check immediately
    checkForChanges();
    
    // Set up periodic checks
    const interval = setInterval(checkForChanges, 2000);
    
    return () => clearInterval(interval);
  }, [canvasData, lastSavedData, getCurrentCanvasData, isInitialLoad]);

  // FIXED: Auto-save functionality with fresh canvas data
  const performAutoSave = useCallback(async () => {
    if (!notebookId || !currentPageNumber) {
      console.log('Auto-save skipped: missing notebook or page');
      return;
    }
    
    console.log('=== PERFORMING AUTO-SAVE ===');
    console.log('NotebookID:', notebookId);
    console.log('Page Number:', currentPageNumber);
    console.log('Has Unsaved Changes:', hasUnsavedChanges);
    
    try {
      // Get the freshest canvas data directly from the canvas engine
      let freshCanvasData = null;
      
      if (getCurrentCanvasData) {
        freshCanvasData = getCurrentCanvasData();
        console.log('Got fresh canvas data from engine, length:', freshCanvasData?.length || 0);
      } else {
        freshCanvasData = canvasData;
        console.log('Using store canvas data, length:', freshCanvasData?.length || 0);
      }
      
      // Use default empty canvas data if nothing exists
      const dataToSave = freshCanvasData || JSON.stringify({
        type: 'drawing',
        version: 1,
        elements: [],
        appState: { 
          width: 870, 
          height: 870, 
          opacity: 100 
        }
      });

      const pageData = {
        notebookId,
        pageNumber: currentPageNumber,
        canvasData: dataToSave,
        settings: pageSettings || {
          pattern: 'grid',
          patternSize: 20,
          patternColor: '#e5e7eb',
          patternOpacity: 50
        }
      };

      console.log('Saving page data:', {
        pageId: `${notebookId}_page_${currentPageNumber}`,
        hasCanvasData: !!dataToSave,
        canvasDataLength: dataToSave.length,
        hasSettings: !!pageData.settings
      });

      const result = await savePage(pageData);
      
      if (result.success) {
        console.log('=== AUTO-SAVE SUCCESSFUL ===');
        setLastSavedData(dataToSave);
        setHasUnsavedChanges(false);
        markChangesSaved();
        
        // Update notebook progress
        await updateNotebookProgress(notebookId, currentPageNumber);
      } else {
        console.error('=== AUTO-SAVE FAILED ===', result.error);
        showNotification?.('error', 'Failed to save page: ' + result.error);
      }
    } catch (error) {
      console.error('=== AUTO-SAVE ERROR ===', error);
      showNotification?.('error', 'Error saving page: ' + error.message);
    }
  }, [
    notebookId, 
    currentPageNumber, 
    hasUnsavedChanges,
    canvasData, 
    pageSettings, 
    getCurrentCanvasData,
    savePage, 
    markChangesSaved, 
    updateNotebookProgress,
    showNotification
  ]);

  // Set up auto-save interval
  useEffect(() => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }

    // Auto-save every 10 seconds if there are unsaved changes
    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        console.log('Auto-save triggered by interval');
        performAutoSave();
      }
    }, 10000); // Reduced from 30s to 10s for better responsiveness

    setAutoSaveInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [hasUnsavedChanges, performAutoSave]);

  // FIXED: Manual save function with fresh canvas data
  const handleManualSave = useCallback(async () => {
    console.log('=== MANUAL SAVE TRIGGERED ===');
    
    if (!notebookId || !currentPageNumber) {
      console.warn('Manual save skipped: missing notebook or page');
      return;
    }
    
    try {
      setSaving(true);
      
      // Force update canvas data from engine first
      if (forceUpdateCanvasData) {
        forceUpdateCanvasData();
      }
      
      // Get the freshest canvas data
      let freshCanvasData = null;
      
      if (getCurrentCanvasData) {
        freshCanvasData = getCurrentCanvasData();
        console.log('Manual save: Got fresh canvas data, length:', freshCanvasData?.length || 0);
      } else {
        freshCanvasData = canvasData;
        console.log('Manual save: Using store canvas data, length:', freshCanvasData?.length || 0);
      }
      
      if (!freshCanvasData) {
        console.warn('No canvas data to save');
        showNotification?.('warning', 'No drawing data to save');
        return;
      }
      
      const pageData = {
        notebookId,
        pageNumber: currentPageNumber,
        canvasData: freshCanvasData,
        settings: pageSettings || {
          pattern: 'grid',
          patternSize: 20,
          patternColor: '#e5e7eb',
          patternOpacity: 50
        }
      };
      
      console.log('Manual save with fresh data:', {
        pageId: `${notebookId}_page_${currentPageNumber}`,
        dataLength: freshCanvasData.length
      });
      
      const result = await savePage(pageData);
      
      if (result.success) {
        console.log('=== MANUAL SAVE SUCCESSFUL ===');
        setLastSavedData(freshCanvasData);
        setHasUnsavedChanges(false);
        markChangesSaved();
        
        // Show success notification
        showNotification?.('success', 'Page saved successfully');
        
        await updateNotebookProgress(notebookId, currentPageNumber);
      } else {
        console.error('=== MANUAL SAVE FAILED ===', result.error);
        showNotification?.('error', 'Failed to save page: ' + result.error);
      }
    } catch (error) {
      console.error('=== MANUAL SAVE ERROR ===', error);
      showNotification?.('error', 'Error saving page: ' + error.message);
    } finally {
      setSaving(false);
    }
  }, [
    notebookId, 
    currentPageNumber, 
    canvasData, 
    pageSettings, 
    getCurrentCanvasData,
    forceUpdateCanvasData,
    savePage, 
    markChangesSaved, 
    updateNotebookProgress,
    showNotification,
    setSaving
  ]);

  // FIXED: Page navigation with forced save
  const handlePageChange = useCallback(async (newPageNumber) => {
    if (newPageNumber === currentPageNumber) return;
    
    console.log(`=== CHANGING PAGE ${currentPageNumber} → ${newPageNumber} ===`);
    
    // Force save current page with fresh canvas data before switching
    try {
      // Get fresh canvas data directly from engine
      let freshCanvasData = null;
      
      if (getCurrentCanvasData) {
        freshCanvasData = getCurrentCanvasData();
        console.log('Page change: Got fresh canvas data for save, length:', freshCanvasData?.length || 0);
      } else {
        freshCanvasData = canvasData;
        console.log('Page change: Using store canvas data for save, length:', freshCanvasData?.length || 0);
      }
      
      if (freshCanvasData && (hasUnsavedChanges || freshCanvasData !== lastSavedData)) {
        console.log('Force saving current page before navigation');
        
        const pageData = {
          notebookId,
          pageNumber: currentPageNumber,
          canvasData: freshCanvasData,
          settings: pageSettings
        };
        
        const result = await savePage(pageData);
        
        if (result.success) {
          console.log('Current page saved successfully before navigation');
          setLastSavedData(freshCanvasData);
          setHasUnsavedChanges(false);
          markChangesSaved();
        } else {
          console.error('Failed to save current page before navigation:', result.error);
        }
      }
    } catch (error) {
      console.error('Error saving before page change:', error);
    }
    
    // Update URL and state
    setCurrentPageNumber(newPageNumber);
    setIsInitialLoad(true); // Reset initial load flag for new page
    navigate(`/notebook/${notebookId}/page/${newPageNumber}`, { replace: true });
  }, [
    currentPageNumber, 
    hasUnsavedChanges,
    lastSavedData,
    canvasData, 
    pageSettings, 
    getCurrentCanvasData,
    savePage, 
    markChangesSaved, 
    navigate, 
    notebookId
  ]);

  const handlePreviousPage = useCallback(() => {
    if (currentPageNumber > 1) {
      handlePageChange(currentPageNumber - 1);
    }
  }, [currentPageNumber, handlePageChange]);

  const handleNextPage = useCallback(() => {
    if (!notebook) return;
    
    const maxPages = notebook.totalPages || notebook.pages || 100;
    if (currentPageNumber < maxPages) {
      handlePageChange(currentPageNumber + 1);
    }
  }, [currentPageNumber, notebook, handlePageChange]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S for manual save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        console.log('Ctrl+S pressed - triggering manual save');
        handleManualSave();
      }
      
      // Page navigation shortcuts
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousPage();
      }
      
      if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPage();
      }
      
      // Escape to go back
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave, handlePreviousPage, handleNextPage]);

  // Save before unmounting
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges) {
        // Perform synchronous save before unmount
        console.log('Component unmounting - performing final save');
        performAutoSave();
      }
    };
  }, [hasUnsavedChanges, performAutoSave]);

  // Handle close - navigate back to notebooks
  const handleClose = useCallback(async () => {
    console.log('=== CLOSING NOTEBOOK ===');
    
    // Save before closing if there are changes
    if (hasUnsavedChanges) {
      console.log('Saving before close');
      await performAutoSave();
    }
    
    // Navigate back to notebooks page
    navigate('/notebooks');
  }, [hasUnsavedChanges, performAutoSave, navigate]);

  if (!notebook) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading notebook...</p>
      </div>
    );
  }

  return (
    <div className={styles.ni_cover}>
      {/* Header with notebook info and actions */}
      <div className={styles.ni_header}>
        <div className={styles.notebookInfo}>
          <button className={styles.backButton} onClick={handleClose}>
            ← Back to Notebooks
          </button>
          <div className={styles.notebookTitle}>
            <h2>{notebook.title}</h2>
            <span className={styles.notebookDescription}>{notebook.description}</span>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <PageNavigator
            currentPage={currentPageNumber}
            totalPages={notebook.totalPages || notebook.pages || 100}
            onPageChange={handlePageChange}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
          
          <div className={styles.saveStatus}>
            {isSaving && <span className={styles.saving}>Saving...</span>}
            {hasUnsavedChanges && !isSaving && (
              <span className={styles.unsaved}>Unsaved changes</span>
            )}
            {!hasUnsavedChanges && !isSaving && (
              <span className={styles.saved}>All changes saved</span>
            )}
          </div>
          
          <button 
            className={styles.saveButton} 
            onClick={handleManualSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className={styles.ni_content}>
        {/* Toolbar */}
        <div className={styles.toolBar}>
          <ToolBar />
        </div>

        {/* Canvas area with panels */}
        <div className={styles.ni_canvas_area}>
          <div className={styles.ni_page_setting}>
            <PageSettingPanel />
          </div>
          
          <div className={styles.ni_canvas}>
            <NoteBookUi />
            
            {/* Loading overlay for page */}
            {isLoading && (
              <div className={styles.pageLoadingOverlay}>
                <div className={styles.pageSpinner}></div>
                <p>Loading page {currentPageNumber}...</p>
              </div>
            )}
          </div>
          
          <div className={styles.ni_pen_setting}>
            {currentTool === 'pen' && <PenSettingPanel />}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className={styles.shortcutsHelp}>
        <span>Ctrl+S: Save</span>
        <span>Ctrl+←/→: Navigate pages</span>
        <span>Esc: Back to notebooks</span>
      </div>
    </div>
  );
};

export default NotebookInside;