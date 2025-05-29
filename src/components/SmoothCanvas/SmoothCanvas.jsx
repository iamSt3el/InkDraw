// src/components/SmoothCanvas/SmoothCanvas.jsx - SIMPLE CLEAN VERSION
import React, { useRef, useEffect, useState, useCallback } from 'react';
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
    setSelection,
    clearSelection
  } = useDrawingStore();

  const { currentPageData } = usePageStore();

  // Refs
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const eventHandlerRef = useRef(null);
  const rendererRef = useRef(null);
  
  const isDraggingSelectionRef = useRef(false);

  // State
  const [paths, setPaths] = useState([]);
  const [pathsToErase, setPathsToErase] = useState(new Set());
  const [eraserPosition, setEraserPosition] = useState({ x: 0, y: 0 });
  const [showEraser, setShowEraser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { width, height } = canvasDimensions;

  // Simple canvas data loader
  const loadCanvasData = useCallback((vectorData) => {
    if (!engineRef.current || !vectorData) return false;

    try {
      engineRef.current.clearPaths();
      engineRef.current.clearSelection();
      
      const success = engineRef.current.importFromJSON(vectorData);
      
      if (success) {
        const currentPaths = engineRef.current.getPaths();
        setPaths([...currentPaths]);
      }
      
      return success;
    } catch (error) {
      console.error('Error loading canvas data:', error);
      return false;
    }
  }, []);

  // Get current canvas data
  const getCurrentCanvasData = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.exportAsJSON();
    }
    return null;
  }, []);

  // Simple clear canvas
  const clearCanvas = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.clearPaths();
      engineRef.current.clearSelection();
      setPaths([]);
      setPathsToErase(new Set());

      // Clear any temporary elements
      const svg = svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      const tempRect = svg?.querySelector('#temp-rectangle');
      if (tempPath) tempPath.remove();
      if (tempRect) tempRect.remove();

      if (rendererRef.current) {
        rendererRef.current.clearRenderedShapes();
      }

      // Update canvas data immediately
      const emptyData = getCurrentCanvasData();
      setCanvasData(emptyData);
      
      return true;
    }
    return false;
  }, [getCurrentCanvasData, setCanvasData]);

  // Update canvas data when content changes
  const updateCanvasData = useCallback(() => {
    if (engineRef.current && isInitialized) {
      const data = getCurrentCanvasData();
      setCanvasData(data);
    }
  }, [getCurrentCanvasData, setCanvasData, isInitialized]);

  // Handle pan events
  const handlePan = useCallback((deltaX, deltaY) => {
    panCanvas(deltaX, deltaY);
  }, [panCanvas]);

  // Handle zoom events
  const handleZoom = useCallback((zoomDelta, center) => {
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomDelta));
    setZoomLevel(newZoom);
  }, [zoomLevel, setZoomLevel]);

  // Selection event handlers
  const handleSelectionChanged = useCallback((selectedItemIds) => {
    setSelection(selectedItemIds);
    
    if (engineRef.current) {
      engineRef.current.setSelectedItems(selectedItemIds);
    }
    
    const currentPaths = engineRef.current.getPaths();
    setPaths([...currentPaths]);
  }, [setSelection]);

  const handleSelectionMoved = useCallback((selectedItemIds) => {
    updateCanvasData();
    const currentPaths = engineRef.current.getPaths();
    setPaths([...currentPaths]);
  }, [updateCanvasData]);

  const handleSelectionResized = useCallback((selectedItemIds) => {
    updateCanvasData();
    const currentPaths = engineRef.current.getPaths();
    setPaths([...currentPaths]);
  }, [updateCanvasData]);

  const handleSelectionDragStart = useCallback(() => {
    isDraggingSelectionRef.current = true;
  }, []);
  
  const handleSelectionDragEnd = useCallback(() => {
    isDraggingSelectionRef.current = false;
    updateCanvasData();
  }, [updateCanvasData]);

  // Load canvas data when it changes (but not during selection drag)
  useEffect(() => {
    if (isInitialized && canvasData && !isDraggingSelectionRef.current) {
      loadCanvasData(canvasData);
    }
  }, [canvasData, isInitialized, loadCanvasData]);

  // Load from page data if available
  useEffect(() => {
    if (isInitialized && currentPageData?.canvasData && !canvasData) {
      loadCanvasData(currentPageData.canvasData);
    }
  }, [currentPageData?.canvasData, isInitialized, canvasData, loadCanvasData]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !svgRef.current || isInitialized) return;

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

    // Set callbacks
    eventHandler.setCallbacks({
      onStrokeComplete: () => {
        const newPaths = [...engine.getPaths()];
        setPaths(newPaths);
        updateCanvasData();
      },
      onShapeComplete: () => {
        const newPaths = [...engine.getPaths()];
        setPaths(newPaths);
        updateCanvasData();
      },
      onPathsErased: () => {
        const newPaths = [...engine.getPaths()];
        setPaths(newPaths);
        updateCanvasData();
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
      onSelectionChanged: handleSelectionChanged,
      onSelectionMoved: handleSelectionMoved,
      onSelectionResized: handleSelectionResized,
      onSelectionDragStart: handleSelectionDragStart,
      onSelectionDragEnd: handleSelectionDragEnd
    });

    eventHandler.attachListeners(canvasRef.current);

    engineRef.current = engine;
    eventHandlerRef.current = eventHandler;
    rendererRef.current = renderer;

    // Register canvas methods
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
            updateCanvasData();
          }
          return success;
        }
        return false;
      },
      getCurrentCanvasData: getCurrentCanvasData,
      loadCanvasData: loadCanvasData,
      // Selection methods
      findItemsInRect: (rect) => {
        return engineRef.current ? engineRef.current.findItemsInRect(rect) : [];
      },
      getSelectionBounds: (selectedItems) => {
        return engineRef.current ? engineRef.current.getSelectionBounds(selectedItems) : null;
      },
      moveSelectedItems: (deltaX, deltaY) => {
        if (engineRef.current) {
          engineRef.current.moveSelectedItems(deltaX, deltaY);
        }
      },
      resizeSelectedItems: (newBounds) => {
        if (engineRef.current) {
          engineRef.current.resizeSelectedItems(newBounds);
        }
      },
      deleteSelectedItems: () => {
        if (engineRef.current) {
          engineRef.current.deleteSelectedItems();
          const newPaths = [...engineRef.current.getPaths()];
          setPaths(newPaths);
          updateCanvasData();
          clearSelection();
        }
      }
    });

    setIsInitialized(true);

    return () => {
      if (eventHandlerRef.current && canvasRef.current) {
        eventHandlerRef.current.detachListeners(canvasRef.current);
      }
      if (engineRef.current) {
        engineRef.current.destroy?.();
      }
    };
  }, []); // Initialize only once

  // Update canvas dimensions
  useEffect(() => {
    if (engineRef.current && isInitialized) {
      engineRef.current.updateOptions({ width, height });
    }
  }, [width, height, isInitialized]);

  // Update tool options
  useEffect(() => {
    if (engineRef.current && eventHandlerRef.current && isInitialized) {
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

  // Sync selection state
  useEffect(() => {
    if (engineRef.current && isInitialized && !isDraggingSelectionRef.current) {
      const storeSelectedArray = Array.from(selectedItems);
      const engineSelectedArray = engineRef.current.getSelectedItems();

      if (JSON.stringify(storeSelectedArray.sort()) !== JSON.stringify(engineSelectedArray.sort())) {
        engineRef.current.setSelectedItems(storeSelectedArray);
        const currentPaths = engineRef.current.getPaths();
        setPaths([...currentPaths]);
      }
    }
  }, [selectedItems, isInitialized]);

  // Update SVG viewBox
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

  const getCursorStyle = () => {
    switch (currentTool) {
      case 'pan': return 'grab';
      case 'pen': return 'crosshair';
      case 'rectangle': return 'crosshair';
      case 'eraser': return 'none';
      case 'select': return 'default';
      default: return 'default';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.canvasContainer} ${styles[`${currentTool}Mode`]}`}
      style={{ width, height }}
    >
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
        {rendererRef.current?.renderPaths(paths, pathsToErase)}
      </svg>

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
        {rendererRef.current?.renderSelectionOverlay()}
      </svg>

      {currentTool === 'eraser' && showEraser &&
        rendererRef.current?.renderEraserCursor(showEraser, eraserPosition, eraserWidth / zoomLevel)}

      <div className={styles.zoomIndicator}>
        {Math.round(zoomLevel * 100)}%
      </div>

      {currentTool === 'select' && selectedItems.size > 0 && (
        <div className={styles.selectionInfo}>
          {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};

export default SmoothCanvas;