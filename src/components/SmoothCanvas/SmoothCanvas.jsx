// src/components/SmoothCanvas/SmoothCanvas.jsx - COMPLETE FIXED VERSION
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { CanvasEngine } from './core/CanvasEngine';
import { EventHandler } from './core/EventHandler';
import { CanvasRenderer } from './core/CanvasRenderer';
import { useDrawingStore } from '../../stores/drawingStore';
import { usePageStore } from '../../stores/pageStore';
import styles from './SmoothCanvas.module.scss';

const SmoothCanvas = () => {
  const {
    currentTool,
    strokeColor,
    strokeWidth,
    opacity,
    eraserWidth,
    canvasDimensions,
    zoomLevel,
    viewBox,
    canvasData,
    setCanvasData,
    registerCanvasMethods,
    clearCanvasData,
    panCanvas,
    setZoomLevel,
    setViewBox,
    // Shape properties
    shapeColor,
    shapeBorderSize,
    shapeFill,
    shapeFillColor,
    shapeRoundCorners,
    // Selection properties
    selectedItems,
    selectionBounds,
    isSelecting,
    selectionRect,
    setSelection,
    clearSelection,
    addToSelection,
    removeFromSelection,
    moveSelection,
    resizeSelection,
    deleteSelection,
    startAreaSelection,
    updateAreaSelection,
    finishAreaSelection
  } = useDrawingStore();

  const { currentPageData } = usePageStore();

  // Refs
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const eventHandlerRef = useRef(null);
  const rendererRef = useRef(null);
  const selectionUpdateTimeoutRef = useRef(null);
  const isDraggingSelectionRef = useRef(false);

  // State
  const [paths, setPaths] = useState([]);
  const [pathsToErase, setPathsToErase] = useState(new Set());
  const [eraserPosition, setEraserPosition] = useState({ x: 0, y: 0 });
  const [showEraser, setShowEraser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const lastLoadedDataRef = useRef(null);
  const isLoadingDataRef = useRef(false);

  const { width, height } = canvasDimensions;

  // FIXED: Load canvas data with selection preservation
  const loadCanvasData = useCallback((vectorData) => {
    if (!engineRef.current || !vectorData || isLoadingDataRef.current) return false;

    if (lastLoadedDataRef.current === vectorData) {
      console.log('SmoothCanvas: Skipping reload of same data');
      return true;
    }

    try {
      console.log('SmoothCanvas: Loading new canvas data...');
      isLoadingDataRef.current = true;

      // PRESERVE SELECTION STATE BEFORE CLEARING
      const previousSelection = Array.from(engineRef.current.getSelectedItems());
      console.log('SmoothCanvas: Preserving selection:', previousSelection);

      engineRef.current.clearPaths();
      setPaths([]);

      const success = engineRef.current.importFromJSON(vectorData);

      if (success) {
        const currentPaths = engineRef.current.getPaths();
        setPaths([...currentPaths]);
        lastLoadedDataRef.current = vectorData;
        console.log('SmoothCanvas: Loaded', currentPaths.length, 'paths');

        // RESTORE SELECTION STATE AFTER LOADING
        if (previousSelection.length > 0) {
          // Filter out any items that no longer exist after reload
          const validSelection = previousSelection.filter(itemId =>
            currentPaths.some(path => path.id === itemId)
          );

          if (validSelection.length > 0) {
            console.log('SmoothCanvas: Restoring selection:', validSelection);
            engineRef.current.setSelectedItems(validSelection);

            // Update the store selection state
            setSelection(validSelection);

            // Trigger re-render with selection
            setPaths([...currentPaths]);
          }
        }
      }

      return success;
    } catch (error) {
      console.error('SmoothCanvas: Error loading canvas data:', error);
      return false;
    } finally {
      isLoadingDataRef.current = false;
    }
  }, [setSelection]);

  // Get current canvas data
  const getCurrentCanvasData = useCallback(() => {
    if (engineRef.current) {
      const data = engineRef.current.exportAsJSON();
      console.log('SmoothCanvas: Getting canvas data, length:', data?.length || 0);
      return data;
    }
    return null;
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (engineRef.current) {
      console.log('SmoothCanvas: Clearing canvas paths');
      engineRef.current.clearPaths();
      setPaths([]);
      setPathsToErase(new Set());

      const svg = svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      const tempRect = svg?.querySelector('#temp-rectangle');
      if (tempPath) tempPath.remove();
      if (tempRect) tempRect.remove();

      if (rendererRef.current) {
        rendererRef.current.clearRenderedShapes();
      }

      lastLoadedDataRef.current = null;
      return true;
    }
    return false;
  }, []);

  // Handle pan events
  const handlePan = useCallback((deltaX, deltaY) => {
    console.log('SmoothCanvas: Handling pan', deltaX, deltaY);
    panCanvas(deltaX, deltaY);
  }, [panCanvas]);

  // Handle zoom events
  const handleZoom = useCallback((zoomDelta, center) => {
    console.log('SmoothCanvas: Handling zoom', zoomDelta);
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomDelta));
    setZoomLevel(newZoom);
  }, [zoomLevel, setZoomLevel]);

  // FIXED: Selection event handlers with proper logging
  const handleSelectionChanged = useCallback((selectedItemIds) => {
    console.log('SmoothCanvas: Selection changed:', selectedItemIds);
    
    // Clear existing timeout
    if (selectionUpdateTimeoutRef.current) {
      clearTimeout(selectionUpdateTimeoutRef.current);
    }
    
    // Debounce selection updates during dragging
    if (isDraggingSelectionRef.current) {
      selectionUpdateTimeoutRef.current = setTimeout(() => {
        setSelection(selectedItemIds);
        
        // Sync engine selection with store
        if (engineRef.current) {
          engineRef.current.setSelectedItems(selectedItemIds);
        }
        
        // Update paths to trigger re-render with selection state
        const currentPaths = engineRef.current.getPaths();
        setPaths([...currentPaths]);
      }, 16); // ~60fps
    } else {
      // Immediate update when not dragging
      setSelection(selectedItemIds);
      
      if (engineRef.current) {
        engineRef.current.setSelectedItems(selectedItemIds);
      }
      
      const currentPaths = engineRef.current.getPaths();
      setPaths([...currentPaths]);
    }
  }, [setSelection]);

  const handleSelectionMoved = useCallback((selectedItemIds) => {
    console.log('SmoothCanvas: Selection moved:', selectedItemIds);
    
    // Clear existing timeout
    if (selectionUpdateTimeoutRef.current) {
      clearTimeout(selectionUpdateTimeoutRef.current);
    }
    
    // Debounce canvas data updates during movement
    selectionUpdateTimeoutRef.current = setTimeout(() => {
      const canvasData = engineRef.current.exportAsJSON();
      setCanvasData(canvasData);
      
      // Update paths to trigger re-render
      const currentPaths = engineRef.current.getPaths();
      setPaths([...currentPaths]);
    }, 50); // Slower for canvas data updates
  }, [setCanvasData]);

  const handleSelectionResized = useCallback((selectedItemIds) => {
    console.log('SmoothCanvas: Selection resized:', selectedItemIds);

    // Update canvas data to save changes
    const canvasData = engineRef.current.exportAsJSON();
    setCanvasData(canvasData);

    // Update paths to trigger re-render
    const currentPaths = engineRef.current.getPaths();
    setPaths([...currentPaths]);
  }, [setCanvasData]);

  const handleSelectionRectChanged = useCallback((rect) => {
    console.log('SmoothCanvas: Selection rect changed:', rect);
    // Force re-render of selection overlay
    const currentPaths = engineRef.current.getPaths();
    setPaths([...currentPaths]);
  }, []);

  const handleSelectionDragStart = useCallback(() => {
    console.log('SmoothCanvas: Selection drag started');
    isDraggingSelectionRef.current = true;
  }, []);
  
  const handleSelectionDragEnd = useCallback(() => {
    console.log('SmoothCanvas: Selection drag ended');
    isDraggingSelectionRef.current = false;
    
    // Force final update
    if (selectionUpdateTimeoutRef.current) {
      clearTimeout(selectionUpdateTimeoutRef.current);
    }
    
    const canvasData = engineRef.current.exportAsJSON();
    setCanvasData(canvasData);
  }, [setCanvasData]);

  // FIXED: Watch canvas data with selection preservation
  useEffect(() => {
    if (isInitialized && canvasData && canvasData !== lastLoadedDataRef.current) {
      // SKIP RELOAD IF WE'RE IN SELECT MODE WITH ACTIVE SELECTION
      if (currentTool === 'select' && selectedItems.size > 0) {
        console.log('SmoothCanvas: Skipping reload during active selection');
        lastLoadedDataRef.current = canvasData;
        return;
      }

      console.log('SmoothCanvas: Canvas data changed in store, loading...');
      loadCanvasData(canvasData);
    }
  }, [canvasData, isInitialized, loadCanvasData, currentTool, selectedItems]);

  // Watch current page data
  useEffect(() => {
    if (isInitialized && currentPageData?.canvasData && !canvasData) {
      console.log('SmoothCanvas: Page data available but no store data, loading from page...');
      loadCanvasData(currentPageData.canvasData);
    }
  }, [currentPageData?.canvasData, isInitialized, canvasData, loadCanvasData]);

  // Initialize canvas ONCE
  useEffect(() => {
    if (!canvasRef.current || !svgRef.current || isInitialized) return;

    console.log('SmoothCanvas: Initializing canvas engine (ONE TIME ONLY)');
    const engine = new CanvasEngine(canvasRef, svgRef, {
      width,
      height,
      strokeColor,
      strokeWidth,
      opacity,
      eraserWidth,
      viewBox,
      shapeColor,
      shapeBorderSize,
      shapeFill,
      shapeFillColor,
      shapeRoundCorners
    });

    const eventHandler = new EventHandler(engine, {
      currentTool,
      strokeColor,
      strokeWidth,
      opacity,
      eraserWidth,
      viewBox,
      zoomLevel
    });

    const renderer = new CanvasRenderer(engine);

    // FIXED: Set callbacks with ALL selection handlers
    eventHandler.setCallbacks({
      onStrokeComplete: () => {
        const newPaths = [...engine.getPaths()];
        setPaths(newPaths);
        if (isInitialized) {
          const canvasData = engine.exportAsJSON();
          setCanvasData(canvasData);
        }
      },
      onShapeComplete: (shape) => {
        console.log('SmoothCanvas: Shape completed:', shape);
        const newPaths = [...engine.getPaths()];
        setPaths(newPaths);
        if (isInitialized) {
          const canvasData = engine.exportAsJSON();
          setCanvasData(canvasData);
        }
      },
      onPathsErased: () => {
        const newPaths = [...engine.getPaths()];
        setPaths(newPaths);
        if (isInitialized) {
          const canvasData = engine.exportAsJSON();
          setCanvasData(canvasData);
        }
      },
      onPathsMarkedForErase: (pathsToErase) => {
        setPathsToErase(new Set(pathsToErase));
      },
      onEraserMove: (position) => {
        setEraserPosition(position);
      },
      onEraserShow: (show) => {
        setShowEraser(show);
      },
      onPan: handlePan,
      onZoom: handleZoom,
      onPanStart: () => {
        console.log('SmoothCanvas: Pan started');
      },
      onPanEnd: () => {
        console.log('SmoothCanvas: Pan ended');
      },
      // FIXED: Add drag state tracking
      onSelectionChanged: handleSelectionChanged,
      onSelectionMoved: handleSelectionMoved,
      onSelectionResized: handleSelectionResized,
      onSelectionRectChanged: handleSelectionRectChanged,
      onSelectionDragStart: handleSelectionDragStart,
      onSelectionDragEnd: handleSelectionDragEnd
    });

    eventHandler.attachListeners(canvasRef.current);

    engineRef.current = engine;
    eventHandlerRef.current = eventHandler;
    rendererRef.current = renderer;

    // FIXED: Register methods with ALL selection methods
    registerCanvasMethods({
      clearCanvas: clearCanvas,
      exportImage: async (format = 'png') => {
        if (engineRef.current) {
          return await engineRef.current.exportAsDataUrl(format, true);
        }
        return '';
      },
      undo: () => {
        if (engineRef.current) {
          const success = engineRef.current.undo();
          if (success) {
            const newPaths = [...engineRef.current.getPaths()];
            setPaths(newPaths);
            if (isInitialized) {
              const canvasData = engineRef.current.exportAsJSON();
              setCanvasData(canvasData);
            }
          }
          return success;
        }
        return false;
      },
      getCurrentCanvasData: getCurrentCanvasData,
      loadCanvasData: loadCanvasData,
      // FIXED: Add all selection methods
      findItemsInRect: (rect) => {
        console.log('SmoothCanvas: findItemsInRect called with:', rect);
        return engineRef.current ? engineRef.current.findItemsInRect(rect) : [];
      },
      getSelectionBounds: (selectedItems) => {
        console.log('SmoothCanvas: getSelectionBounds called with:', selectedItems);
        return engineRef.current ? engineRef.current.getSelectionBounds(selectedItems) : null;
      },
      moveSelectedItems: (deltaX, deltaY) => {
        console.log('SmoothCanvas: moveSelectedItems called with:', deltaX, deltaY);
        if (engineRef.current) {
          engineRef.current.moveSelectedItems(deltaX, deltaY);
        }
      },
      resizeSelectedItems: (newBounds) => {
        console.log('SmoothCanvas: resizeSelectedItems called with:', newBounds);
        if (engineRef.current) {
          engineRef.current.resizeSelectedItems(newBounds);
        }
      },
      deleteSelectedItems: () => {
        console.log('SmoothCanvas: deleteSelectedItems called');
        if (engineRef.current) {
          engineRef.current.deleteSelectedItems();
          const newPaths = [...engineRef.current.getPaths()];
          setPaths(newPaths);
          if (isInitialized) {
            const canvasData = engineRef.current.exportAsJSON();
            setCanvasData(canvasData);
          }
          clearSelection();
        }
      }
    });

    setIsInitialized(true);

    // Add debug verification
    console.log('=== CANVAS METHODS REGISTERED ===');
    console.log('Selection methods available:', {
      findItemsInRect: !!engine.findItemsInRect,
      getSelectionBounds: !!engine.getSelectionBounds,
      moveSelectedItems: !!engine.moveSelectedItems,
      resizeSelectedItems: !!engine.resizeSelectedItems,
      deleteSelectedItems: !!engine.deleteSelectedItems
    });
    console.log('Total paths in engine:', engine.paths?.length || 0);

    return () => {
      if (eventHandlerRef.current && canvasRef.current) {
        eventHandlerRef.current.detachListeners(canvasRef.current);
      }
      if (engineRef.current) {
        engineRef.current.destroy?.();
      }
    };
  }, []); // Empty dependency array - initialize only once

  // Update canvas dimensions
  useEffect(() => {
    if (engineRef.current && isInitialized && (width !== engineRef.current.options.width || height !== engineRef.current.options.height)) {
      console.log('SmoothCanvas: Updating canvas dimensions');
      engineRef.current.updateOptions({ width, height });
    }
  }, [width, height, isInitialized]);

  // Update tool options including shape properties and maintain selection sync
  useEffect(() => {
    if (engineRef.current && eventHandlerRef.current && isInitialized) {
      // Update engine options
      engineRef.current.updateOptions({
        strokeColor,
        strokeWidth,
        opacity,
        eraserWidth,
        viewBox,
        shapeColor,
        shapeBorderSize,
        shapeFill,
        shapeFillColor,
        shapeRoundCorners
      });

      // Update event handler options
      eventHandlerRef.current.options = {
        ...eventHandlerRef.current.options,
        currentTool,
        strokeColor,
        strokeWidth,
        opacity,
        eraserWidth,
        viewBox,
        zoomLevel
      };

      engineRef.current.isErasing = currentTool === 'eraser';

      if (currentTool !== 'eraser') {
        setPathsToErase(new Set());
        setShowEraser(false);
      }

      // Clear selection when switching away from select tool
      if (currentTool !== 'select' && selectedItems.size > 0) {
        clearSelection();
        if (engineRef.current) {
          engineRef.current.clearSelection();
        }
      }
    }
  }, [currentTool, strokeColor, strokeWidth, opacity, eraserWidth, viewBox, zoomLevel,
    shapeColor, shapeBorderSize, shapeFill, shapeFillColor, shapeRoundCorners,
    isInitialized, selectedItems, clearSelection]);

  // FIXED: Sync store selection state with engine
  useEffect(() => {
    if (engineRef.current && isInitialized) {
      // Sync engine selection with store selection
      const storeSelectedArray = Array.from(selectedItems);
      const engineSelectedArray = engineRef.current.getSelectedItems();

      // Only update if they're different
      if (JSON.stringify(storeSelectedArray.sort()) !== JSON.stringify(engineSelectedArray.sort())) {
        console.log('Syncing engine selection with store:', storeSelectedArray);
        engineRef.current.setSelectedItems(storeSelectedArray);

        // Force re-render to show selection state
        const currentPaths = engineRef.current.getPaths();
        setPaths([...currentPaths]);
      }
    }
  }, [selectedItems, isInitialized]);

  // Update SVG viewBox when viewBox changes
  useEffect(() => {
    if (svgRef.current && viewBox) {
      svgRef.current.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    }
  }, [viewBox]);

  // Update eraser preview
  useEffect(() => {
    if (rendererRef.current && isInitialized) {
      rendererRef.current.updateEraserPreview(pathsToErase);
    }
  }, [pathsToErase, isInitialized]);

  const dpr = window.devicePixelRatio || 1;

  // Get cursor style based on current tool
  const getCursorStyle = () => {
    switch (currentTool) {
      case 'pan':
        return 'grab';
      case 'pen':
        return 'crosshair';
      case 'rectangle':
        return 'crosshair';
      case 'eraser':
        return 'none';
      case 'select':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.canvasContainer} ${styles[`${currentTool}Mode`]}`}
      style={{ width, height }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width * dpr}
        height={height * dpr}
        className={styles.canvas}
        style={{
          touchAction: 'none',
          width: `${width}px`,
          height: `${height}px`,
          background: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 2,
          cursor: getCursorStyle()
        }}
      />

      {/* SVG for paths and shapes */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className={styles.svg}
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1
        }}
      >
        {/* Render stroke paths */}
        {rendererRef.current?.renderPaths(paths, pathsToErase)}
      </svg>

      {/* Selection overlay SVG */}
      <svg
        width={width}
        height={height}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 3
        }}
      >
        {/* Render selection overlay */}
        {rendererRef.current?.renderSelectionOverlay()}
      </svg>

      {/* Eraser cursor */}
      {currentTool === 'eraser' && showEraser &&
        rendererRef.current?.renderEraserCursor(showEraser, eraserPosition, eraserWidth / zoomLevel)}

      {/* Zoom indicator */}
      <div className={styles.zoomIndicator}>
        {Math.round(zoomLevel * 100)}%
      </div>

      {/* Loading indicator */}
      {isLoadingDataRef.current && (
        <div className={styles.dataLoadingIndicator}>
          <div className={styles.miniSpinner}></div>
        </div>
      )}

      {/* Selection info display */}
      {currentTool === 'select' && selectedItems.size > 0 && (
        <div className={styles.selectionInfo}>
          {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

export default SmoothCanvas;