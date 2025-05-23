// src/pages/NotebookInside/Index.jsx - Updated with URL parameters and navigation
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

const NotebookInside = () => {
  const navigate = useNavigate();
  const { notebookId, pageNumber } = useParams();
  
  const { currentTool, canvasData, pageSettings, markChangesSaved } = useDrawingStore();
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
    isLoading 
  } = usePageStore();

  const [currentPageNumber, setCurrentPageNumber] = useState(parseInt(pageNumber) || 1);
  const [notebook, setNotebook] = useState(null);
  const [autoSaveInterval, setAutoSaveInterval] = useState(null);
  const [lastSavedData, setLastSavedData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
      
      console.log(`Loading page ${currentPageNumber} for notebook ${notebookId}`);
      
      try {
        const result = await loadPage(notebookId, currentPageNumber);
        if (result.success) {
          console.log('Page loaded successfully:', result.page.id);
          setLastSavedData(result.page.canvasData);
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error('Error loading page:', error);
      }
    };

    loadCurrentPage();
  }, [notebookId, currentPageNumber, loadPage]);

  // Detect canvas changes for auto-save
  useEffect(() => {
    if (canvasData && lastSavedData && canvasData !== lastSavedData) {
      setHasUnsavedChanges(true);
    }
  }, [canvasData, lastSavedData]);

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!notebookId || !currentPageNumber || !hasUnsavedChanges) return;
    
    console.log('Performing auto-save...');
    
    try {
      const pageData = {
        notebookId,
        pageNumber: currentPageNumber,
        canvasData: canvasData || JSON.stringify({
          type: 'drawing',
          version: 1,
          elements: [],
          appState: { width: 870, height: 870 }
        }),
        settings: pageSettings
      };

      const result = await savePage(pageData);
      
      if (result.success) {
        console.log('Auto-save successful');
        setLastSavedData(pageData.canvasData);
        setHasUnsavedChanges(false);
        markChangesSaved();
        
        // Update notebook progress
        await updateNotebookProgress(notebookId, currentPageNumber);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [notebookId, currentPageNumber, canvasData, pageSettings, hasUnsavedChanges, savePage, markChangesSaved, updateNotebookProgress]);

  // Set up auto-save interval
  useEffect(() => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }

    // Auto-save every 30 seconds if there are unsaved changes
    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        performAutoSave();
      }
    }, 30000);

    setAutoSaveInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [hasUnsavedChanges, performAutoSave]);

  // Manual save function
  const handleManualSave = useCallback(async () => {
    await performAutoSave();
  }, [performAutoSave]);

  // Page navigation functions with URL updates
  const handlePageChange = useCallback(async (newPageNumber) => {
    if (newPageNumber === currentPageNumber) return;
    
    // Save current page before switching
    if (hasUnsavedChanges) {
      await performAutoSave();
    }
    
    // Update URL and state
    setCurrentPageNumber(newPageNumber);
    navigate(`/notebook/${notebookId}/page/${newPageNumber}`, { replace: true });
  }, [currentPageNumber, hasUnsavedChanges, performAutoSave, navigate, notebookId]);

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
        performAutoSave();
      }
    };
  }, [hasUnsavedChanges, performAutoSave]);

  // Handle close - navigate back to notebooks
  const handleClose = useCallback(async () => {
    // Save before closing
    if (hasUnsavedChanges) {
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
            disabled={isSaving || !hasUnsavedChanges}
          >
            Save
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