
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './NotebookInside.module.scss';
import ToolBar from '../../components/ToolBar/Index';
import NoteBookUi from '../../components/NotebookUi/Index';
import PageSettingPanel from '../../components/PagePanel/PagePanel';
import PenSettingPanel from '../../components/PenPanel/PenPanel';
import ShapePanel from '../../components/ShapePanel/ShapePanel';
import AiTextPanel from '../../components/AiTextPanel/AiTextPanel'; 
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

  const { 
    showNotification, 
    switchPanelForTool,
    isPenPanelVisible,
    isShapePanelVisible,
    isAiTextPanelVisible 
  } = useUIStore();

  
  const [currentPageNumber, setCurrentPageNumber] = useState(parseInt(pageNumber) || 1);
  const [notebook, setNotebook] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  
  const saveTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);
  const lastSavedPageRef = useRef(null);

  
  const loadPageData = useCallback(async (pageNum) => {
    if (!notebookId || isTransitioning) return null;
    
    try {
      console.log(`Loading page ${pageNum} data...`);
      const result = await loadPage(notebookId, pageNum);
      
      if (result.success) {
        console.log(`Page ${pageNum} data loaded successfully`);
        return result.page;
      }
    } catch (error) {
      console.error('Error loading page:', error);
      showNotification?.('error', 'Failed to load page');
    }
    return null;
  }, [notebookId, loadPage, isTransitioning, showNotification]);

  
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

  
  const transitionToPage = useCallback(async (newPageNumber) => {
    if (newPageNumber === currentPageNumber || isTransitioning) return;

    console.log(`Transitioning from page ${currentPageNumber} to ${newPageNumber}`);
    setIsTransitioning(true);

    try {
      
      await saveCurrentPage(currentPageNumber);
      
      
      clearCanvasData();
      
      
      setCurrentPageNumber(newPageNumber);
      window.history.replaceState(null, '', `/notebook/${notebookId}/page/${newPageNumber}`);
      
      
      const newPageData = await loadPageData(newPageNumber);
      
      
      if (newPageData?.canvasData) {
        setCanvasData(newPageData.canvasData);
      } else {
        setCanvasData('{"type":"drawing","version":1,"elements":[]}');
      }
      
    } catch (error) {
      console.error('Error transitioning pages:', error);
      showNotification?.('error', 'Failed to switch pages');
    } finally {
      setTimeout(() => setIsTransitioning(false), 100);
    }
  }, [currentPageNumber, isTransitioning, saveCurrentPage, loadPageData, clearCanvasData, setCanvasData, notebookId, showNotification]);

  
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

  
  useEffect(() => {
    if (isInitializedRef.current && notebookId && currentPageNumber && !isTransitioning) {
      const loadInitialPage = async () => {
        const pageData = await loadPageData(currentPageNumber);
        if (pageData?.canvasData) {
          setCanvasData(pageData.canvasData);
        }
      };
      loadInitialPage();
    }
  }, [isInitializedRef.current, notebookId, currentPageNumber, loadPageData, setCanvasData, isTransitioning]);

  
  useEffect(() => {
    if (switchPanelForTool) {
      switchPanelForTool(currentTool);
    }
  }, [currentTool, switchPanelForTool]);

  
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

  
  const handleBackToNotebooks = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    await saveCurrentPage();
    clearCurrentPageData();
    navigate('/notebooks');
  }, [saveCurrentPage, clearCurrentPageData, navigate]);

  
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
      
      if (e.key === 'a' || e.key === 'A') {
        if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
          e.preventDefault();
          const { setTool } = useDrawingStore.getState();
          setTool('aiHandwriting');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave, handlePreviousPage, handleNextPage, handleBackToNotebooks, isTransitioning]);

  
  useEffect(() => {
    if (isTransitioning) return;
    
    const interval = setInterval(() => {
      if (!isTransitioning) {
        saveCurrentPage();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [saveCurrentPage, isTransitioning]);

  
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
      {}
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

      {}
      <div className={styles.ni_content}>
        <div className={styles.ni_canvas_area}>
          {}
          <div className={styles.ni_page_setting}>
            <PageSettingPanel />
          </div>
          
          {}
          <div className={styles.ni_canvas}>
            <NoteBookUi />
          </div>
          
          {}
          <div className={styles.ni_drawing_settings}>
            {isPenPanelVisible && <PenSettingPanel />}
            {isShapePanelVisible && <ShapePanel />}
            {}
            {isAiTextPanelVisible && <AiTextPanel />}
          </div>
        </div>
      </div>

      {}
      <div className={styles.shortcutsHelp}>
        <span>Ctrl+S: Save</span>
        <span>Ctrl+←/→: Navigate Pages</span>
        <span>A: AI Handwriting Tool</span>
        <span>Esc: Back to Notebooks</span>
        {currentTool === 'rectangle' && <span>Drag: Draw Rectangle</span>}
        {currentTool === 'aiHandwriting' && <span>Write & Wait: AI Conversion</span>}
      </div>
    </div>
  );
};

export default NotebookInside;