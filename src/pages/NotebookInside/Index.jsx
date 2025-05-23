// ===============================
// src/pages/NotebookInside/Index.jsx - SIMPLE VERSION
// ===============================
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
    pageSettings, 
    getCurrentCanvasData,
    clearCanvas: clearCanvasMethod
  } = useDrawingStore();
  
  const { 
    notebooks, 
    currentNotebook, 
    setCurrentNotebook,
  } = useNotebookStore();
  
  const { 
    savePage, 
    loadPage,
    isSaving
  } = usePageStore();

  const { showNotification } = useUIStore();

  const [currentPageNumber, setCurrentPageNumber] = useState(parseInt(pageNumber) || 1);
  const [notebook, setNotebook] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // Initialize notebook
  useEffect(() => {
    if (!notebookId) {
      navigate('/');
      return;
    }

    let foundNotebook = notebooks.find(nb => nb.id === notebookId);
    if (!foundNotebook && currentNotebook?.id === notebookId) {
      foundNotebook = currentNotebook;
    }
    
    if (!foundNotebook) {
      navigate('/');
      return;
    }

    setNotebook(foundNotebook);
    setCurrentNotebook(notebookId);
  }, [notebookId, notebooks, currentNotebook, setCurrentNotebook, navigate]);

  // Load page data when component mounts or page changes
  useEffect(() => {
    if (notebookId && currentPageNumber && !isSwitching) {
      loadPageData(currentPageNumber);
    }
  }, [notebookId, currentPageNumber, isSwitching]);

  // Simple function to load page data
  const loadPageData = async (pageNum) => {
    try {
      const result = await loadPage(notebookId, pageNum);
      if (result.success && result.page.canvasData) {
        // Load canvas data if exists
        const canvasData = result.page.canvasData;
        // The SmoothCanvas component will handle loading this data
        console.log(`Loaded page ${pageNum} with ${canvasData.length} characters of data`);
      }
    } catch (error) {
      console.error('Error loading page:', error);
      showNotification?.('error', 'Failed to load page');
    }
  };

  // Simple function to save current page
  const saveCurrentPage = async () => {
    if (!getCurrentCanvasData || !notebookId || !currentPageNumber) return;

    try {
      const canvasData = getCurrentCanvasData();
      
      const pageData = {
        notebookId,
        pageNumber: currentPageNumber,
        canvasData: canvasData || '{"type":"drawing","version":1,"elements":[]}',
        settings: pageSettings || {
          pattern: 'grid',
          patternSize: 20,
          patternColor: '#e5e7eb',
          patternOpacity: 50
        }
      };

      const result = await savePage(pageData);
      if (result.success) {
        console.log(`Saved page ${currentPageNumber}`);
        return true;
      } else {
        console.error('Failed to save page:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving page:', error);
      return false;
    }
  };

  // Simple page switching function
  const switchToPage = async (newPageNumber) => {
    if (newPageNumber === currentPageNumber || isSwitching) return;

    console.log(`Switching from page ${currentPageNumber} to ${newPageNumber}`);
    setIsSwitching(true);

    try {
      // Step 1: Save current page
      await saveCurrentPage();

      // Step 2: Clear canvas
      if (clearCanvasMethod) {
        clearCanvasMethod();
      }

      // Step 3: Update page number and URL
      setCurrentPageNumber(newPageNumber);
      window.history.replaceState(null, '', `/notebook/${notebookId}/page/${newPageNumber}`);

      // Step 4: Load new page (useEffect will handle this)
      
    } catch (error) {
      console.error('Error switching pages:', error);
      showNotification?.('error', 'Failed to switch pages');
    } finally {
      setIsSwitching(false);
    }
  };

  // Handle page navigation
  const handlePageChange = (newPageNumber) => {
    switchToPage(newPageNumber);
  };

  const handlePreviousPage = () => {
    if (currentPageNumber > 1) {
      switchToPage(currentPageNumber - 1);
    }
  };

  const handleNextPage = () => {
    if (!notebook) return;
    const maxPages = notebook.totalPages || 100;
    if (currentPageNumber < maxPages) {
      switchToPage(currentPageNumber + 1);
    }
  };

  // Manual save
  const handleManualSave = async () => {
    const success = await saveCurrentPage();
    if (success) {
      showNotification?.('success', 'Page saved successfully');
    } else {
      showNotification?.('error', 'Failed to save page');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousPage();
      }
      if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPage();
      }
      if (e.key === 'Escape') {
        navigate('/notebooks');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave, handlePreviousPage, handleNextPage, navigate]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSwitching) {
        saveCurrentPage();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isSwitching]);

  // Save before closing
  const handleClose = async () => {
    await saveCurrentPage();
    navigate('/notebooks');
  };

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
      {/* Header */}
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
            totalPages={notebook.totalPages || 100}
            onPageChange={handlePageChange}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
          
          <div className={styles.saveStatus}>
            {isSwitching && <span className={styles.switching}>Switching pages...</span>}
            {isSaving && !isSwitching && <span className={styles.saving}>Saving...</span>}
          </div>
          
          <button 
            className={styles.saveButton} 
            onClick={handleManualSave}
            disabled={isSaving || isSwitching}
          >
            Save
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className={styles.ni_content}>
        <div className={styles.toolBar}>
          <ToolBar />
        </div>

        <div className={styles.ni_canvas_area}>
          <div className={styles.ni_page_setting}>
            <PageSettingPanel />
          </div>
          
          <div className={styles.ni_canvas}>
            <NoteBookUi />
            
            {/* Simple switching overlay */}
            {isSwitching && (
              <div className={styles.pageLoadingOverlay}>
                <div className={styles.pageSpinner}></div>
                <p>Switching to page {currentPageNumber}...</p>
              </div>
            )}
          </div>
          
          <div className={styles.ni_pen_setting}>
            {currentTool === 'pen' && <PenSettingPanel />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotebookInside;