// ===============================
// src/pages/NotebookInside/Index.jsx - UPDATED FOR NEW TOOLBAR LAYOUT
// ===============================
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './NotebookInside.module.scss';
import ToolBar from '../../components/ToolBar/Index';
import NoteBookUi from '../../components/NotebookUi/Index';
import PageSettingPanel from '../../components/PagePanel/PagePanel';
import PenSettingPanel from '../../components/PenPanel/PenPanel';
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
    clearCanvasData,
    setCanvasData
  } = useDrawingStore();
  
  const { 
    notebooks, 
    currentNotebook, 
    setCurrentNotebook,
  } = useNotebookStore();
  
  const { 
    savePage, 
    loadPage,
    isSaving,
    clearCurrentPageData
  } = usePageStore();

  const { showNotification } = useUIStore();

  // State management
  const [currentPageNumber, setCurrentPageNumber] = useState(parseInt(pageNumber) || 1);
  const [notebook, setNotebook] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingPageData, setPendingPageData] = useState(null);
  
  // Refs
  const saveTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);
  const lastSavedPageRef = useRef(null);

  // Memoized page data loader
  const loadPageData = useCallback(async (pageNum) => {
    if (!notebookId || isTransitioning) return null;
    
    try {
      console.log(`Loading page ${pageNum} data...`);
      const result = await loadPage(notebookId, pageNum);
      
      if (result.success) {
        setPendingPageData(result.page);
        console.log(`Page ${pageNum} data prepared for loading`);
        return result.page;
      }
    } catch (error) {
      console.error('Error loading page:', error);
      showNotification?.('error', 'Failed to load page');
    }
    return null;
  }, [notebookId, loadPage, isTransitioning, showNotification]);

  // Optimized save function
  const saveCurrentPage = useCallback(async (pageNum = currentPageNumber) => {
    if (!getCurrentCanvasData || !notebookId || !pageNum) return false;

    try {
      const canvasData = getCurrentCanvasData();
      
      if (lastSavedPageRef.current === pageNum && !canvasData) {
        return true;
      }
      
      const pageData = {
        notebookId,
        pageNumber: pageNum,
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
        lastSavedPageRef.current = pageNum;
        console.log(`Saved page ${pageNum}`);
        return true;
      } else {
        console.error('Failed to save page:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving page:', error);
      return false;
    }
  }, [getCurrentCanvasData, notebookId, currentPageNumber, pageSettings, savePage]);

  // Fast page transition
  const transitionToPage = useCallback(async (newPageNumber) => {
    if (newPageNumber === currentPageNumber || isTransitioning) return;

    console.log(`Quick transition from page ${currentPageNumber} to ${newPageNumber}`);
    setIsTransitioning(true);

    try {
      // Parallel operations for speed
      const savePromise = saveCurrentPage(currentPageNumber);
      const loadPromise = loadPageData(newPageNumber);
      const [, newPageData] = await Promise.all([savePromise, loadPromise]);

      // Quick data update
      clearCanvasData();
      setCurrentPageNumber(newPageNumber);
      window.history.replaceState(null, '', `/notebook/${notebookId}/page/${newPageNumber}`);

      // Set new data immediately
      if (newPageData?.canvasData) {
        setCanvasData(newPageData.canvasData);
      } else {
        setCanvasData('{"type":"drawing","version":1,"elements":[]}');
      }

      setPendingPageData(null);
      
    } catch (error) {
      console.error('Error transitioning pages:', error);
      showNotification?.('error', 'Failed to switch pages');
    } finally {
      setTimeout(() => setIsTransitioning(false), 100);
    }
  }, [currentPageNumber, isTransitioning, saveCurrentPage, loadPageData, clearCanvasData, setCanvasData, notebookId, showNotification]);

  // Initialize notebook
  useEffect(() => {
    if (!notebookId || isInitializedRef.current) return;

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
    isInitializedRef.current = true;
  }, [notebookId, notebooks, currentNotebook, setCurrentNotebook, navigate]);

  // Load initial page data
  useEffect(() => {
    if (isInitializedRef.current && notebookId && currentPageNumber && !isTransitioning) {
      loadPageData(currentPageNumber);
    }
  }, [isInitializedRef.current, notebookId, currentPageNumber, loadPageData, isTransitioning]);

  // Handle pending page data updates
  useEffect(() => {
    if (pendingPageData && !isTransitioning) {
      setCanvasData(pendingPageData.canvasData);
      setPendingPageData(null);
    }
  }, [pendingPageData, isTransitioning, setCanvasData]);

  // Navigation handlers
  const handlePageChange = useCallback((newPageNumber) => {
    transitionToPage(newPageNumber);
  }, [transitionToPage]);

  const handlePreviousPage = useCallback(() => {
    if (currentPageNumber > 1) {
      transitionToPage(currentPageNumber - 1);
    }
  }, [currentPageNumber, transitionToPage]);

  const handleNextPage = useCallback(() => {
    if (!notebook) return;
    const maxPages = notebook.totalPages || 100;
    if (currentPageNumber < maxPages) {
      transitionToPage(currentPageNumber + 1);
    }
  }, [notebook, currentPageNumber, transitionToPage]);

  // Manual save
  const handleManualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    const success = await saveCurrentPage();
    if (success) {
      showNotification?.('success', 'Page saved successfully');
    } else {
      showNotification?.('error', 'Failed to save page');
    }
  }, [saveCurrentPage, showNotification]);

  // Back to notebooks
  const handleBackToNotebooks = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    await saveCurrentPage();
    clearCurrentPageData();
    navigate('/notebooks');
  }, [saveCurrentPage, clearCurrentPageData, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isTransitioning) return;
      
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
        handleBackToNotebooks();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave, handlePreviousPage, handleNextPage, handleBackToNotebooks, isTransitioning]);

  // Auto-save
  useEffect(() => {
    if (isTransitioning) return;
    
    const interval = setInterval(() => {
      if (!isTransitioning) {
        saveCurrentPage();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [saveCurrentPage, isTransitioning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      clearCurrentPageData();
    };
  }, [clearCurrentPageData]);

  if (!notebook || !isInitializedRef.current) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading notebook...</p>
      </div>
    );
  }

  return (
    <div className={styles.ni_cover}>
      {/* FIXED TOOLBAR: Now with proper layout - Page Nav (Left), Tools (Center), Menu (Right) */}
      <ToolBar 
        notebookInfo={{
          title: notebook.title,
          description: notebook.description
        }}
        currentPage={currentPageNumber}
        totalPages={notebook.totalPages || 100}
        onPageChange={handlePageChange}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onBackToNotebooks={handleBackToNotebooks}
        onSave={handleManualSave}
        isSaving={isSaving}
        isTransitioning={isTransitioning}
      />

      {/* MAIN CONTENT: Clean layout without zoom controls (now at bottom) */}
      <div className={styles.ni_content}>
        <div className={styles.ni_canvas_area}>
          <div className={styles.ni_page_setting}>
            <PageSettingPanel />
          </div>
          
          <div className={styles.ni_canvas}>
            <NoteBookUi />
          </div>
          
          <div className={styles.ni_pen_setting}>
            {currentTool === 'pen' && <PenSettingPanel />}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className={styles.shortcutsHelp}>
        <span>Ctrl+S: Save</span>
        <span>Ctrl+←/→: Switch Pages</span>
        <span>Esc: Back to Notebooks</span>
      </div>
    </div>
  );
};

export default NotebookInside;