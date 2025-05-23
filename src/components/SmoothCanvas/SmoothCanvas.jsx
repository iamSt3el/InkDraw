// src/components/SmoothCanvas/SmoothCanvas.jsx - FIXED VERSION
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasEngine } from './core/CanvasEngine';
import { EventHandler } from './core/EventHandler';
import { CanvasRenderer } from './core/CanvasRenderer';
import { useDrawingStore } from '../../stores/drawingStore';
import { usePageStore } from '../../stores/pageStore';
import styles from './SmoothCanvas.module.scss';

const SmoothCanvas = () => {
  // Use store state
  const {
    currentTool,
    strokeColor,
    strokeWidth,
    opacity,
    eraserWidth,
    canvasDimensions,
    zoomLevel,
    viewBox,
    setViewBox,
    panCanvas,
    setCanvasData,
    registerCanvasMethods,
  } = useDrawingStore();

  const { currentPageData, savePage } = usePageStore();

  // Local refs for DOM elements
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Refs for canvas engine components
  const engineRef = useRef(null);
  const eventHandlerRef = useRef(null);
  const rendererRef = useRef(null);

  // Local state
  const [paths, setPaths] = useState([]);
  const [pathsToErase, setPathsToErase] = useState(new Set());
  const [eraserPosition, setEraserPosition] = useState({ x: 0, y: 0 });
  const [showEraser, setShowEraser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState(null);

  // Get dimensions from store
  const { width, height } = canvasDimensions;

  // ADDED: Method to get current canvas data directly from engine
  const getCurrentCanvasData = useCallback(() => {
    if (engineRef.current) {
      const data = engineRef.current.exportAsJSON();
      console.log('SmoothCanvas: Getting current canvas data, length:', data?.length || 0);
      return data;
    }
    console.warn('SmoothCanvas: Engine not available for getCurrentCanvasData');
    return null;
  }, []);

  // Debug paths
  useEffect(() => {
    if (isInitialized && engineRef.current) {
      const pathCount = engineRef.current.getPaths().length;
      console.log(`Current path count: ${pathCount}, State paths: ${paths.length}`);
      
      // Check if there's a mismatch between engine paths and state paths
      if (pathCount !== paths.length) {
        console.log('Path count mismatch, syncing state with engine');
        setPaths([...engineRef.current.getPaths()]);
      }
    }
  }, [isInitialized, paths.length]);

  // Load canvas data when page changes
  useEffect(() => {
    if (isInitialized && engineRef.current && currentPageData?.canvasData) {
      console.log('Loading drawing data from page:', currentPageData.id);
      loadDrawingData(currentPageData.canvasData);
    }
  }, [currentPageData?.id, isInitialized]);

  // Initialize canvas engine
  useEffect(() => {
    if (!canvasRef.current || !svgRef.current) return;

    console.log('Initializing canvas engine');
    const engine = new CanvasEngine(canvasRef, svgRef, {
      width,
      height,
      strokeColor,
      strokeWidth,
      opacity,  // Pass opacity to engine
      eraserWidth,
      viewBox    // Pass initial viewBox to engine
    });

    const eventHandler = new EventHandler(engine, {
      currentTool,
      strokeColor,
      strokeWidth,
      opacity,  // Pass opacity to event handler
      eraserWidth,
      viewBox,
     // Pass viewBox to event handler for coordinate transformations
    });

    const renderer = new CanvasRenderer(engine);

    // Set callbacks - UPDATED VERSION
    eventHandler.setCallbacks({
      onStrokeComplete: () => {
        console.log('Stroke completed, paths before update:', engine.getPaths().length);
        
        // Use a function reference to ensure we're getting the latest state
        setPaths((prevPaths) => {
          const currentPaths = engine.getPaths();
          console.log('Setting new paths, count:', currentPaths.length);
          return [...currentPaths];
        });
        
        if (isInitialized) {
          const canvasData = engine.exportAsJSON();
          
          // Add debugging to see what's happening with the JSON data
          try {
            const parsedData = JSON.parse(canvasData);
            console.log('Canvas data updated, elements count:', parsedData.elements.length);
          } catch (e) {
            console.error('Error parsing canvas data:', e);
          }
    
          // Update drawing store with new canvas data - IMMEDIATE UPDATE
          console.log('SmoothCanvas: Updating store with fresh canvas data');
          setCanvasData(canvasData);
    
          // Note: We don't save to page here anymore - let the parent component handle saving
          // This prevents double-saving and timing issues
        } else {
          console.log('Not updating store - canvas not initialized');
        }
      },
      onPathsErased: () => {
        console.log('Paths erased, updating state');
        setPaths([...engine.getPaths()]);
        if (isInitialized) {
          const canvasData = engine.exportAsJSON();
          console.log('SmoothCanvas: Updating store after erase');
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
      }
    });

    // Attach event listeners
    eventHandler.attachListeners(canvasRef.current);

    engineRef.current = engine;
    eventHandlerRef.current = eventHandler;
    rendererRef.current = renderer;

    // Register canvas methods with the store - UPDATED
    registerCanvasMethods({
      clearCanvas: clearCanvas,
      exportImage: exportImage,
      undo: undo,
      getCurrentCanvasData: getCurrentCanvasData // ADDED
    });

    setIsInitialized(true);
    console.log('Canvas initialized');

    return () => {
      if (eventHandlerRef.current && canvasRef.current) {
        eventHandlerRef.current.detachListeners(canvasRef.current);
      }
    };
  }, [width, height, setCanvasData, registerCanvasMethods, getCurrentCanvasData]);

  // Update options when store state changes
  useEffect(() => {
    if (engineRef.current && eventHandlerRef.current && isInitialized) {
      console.log(`Tool changed to: ${currentTool}`);
      
      engineRef.current.updateOptions({
        width,
        height,
        strokeColor,
        strokeWidth,
        opacity,
        eraserWidth,
        viewBox
      });

      eventHandlerRef.current.options = {
        ...eventHandlerRef.current.options,
        currentTool,
        strokeColor,
        strokeWidth,
        opacity,
        eraserWidth,
        viewBox
      };

      // Explicitly set erasing state
      engineRef.current.isErasing = currentTool === 'eraser';
      console.log(`Engine erasing state: ${engineRef.current.isErasing}`);

      if (currentTool !== 'eraser') {
        // Clear eraser state
        setPathsToErase(new Set());
        setShowEraser(false);
      }
      
      // Make sure any temp paths are cleaned up on tool change
      const svg = svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      if (tempPath) {
        console.log('Cleaning up temp path on tool change');
        tempPath.remove();
      }
    }
  }, [currentTool, strokeColor, strokeWidth, opacity, eraserWidth, width, height, viewBox, isInitialized]);

  // Handle zoom with mouse wheel
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      const zoomIntensity = 0.001;
      const delta = -e.deltaY * zoomIntensity;
      const newZoom = Math.max(0.1, Math.min(5, zoomLevel * (1 + delta)));

      // Get mouse position relative to canvas
      const rect = svgRef.current.getBoundingClientRect();
      const offsetX = (e.clientX - rect.left);
      const offsetY = (e.clientY - rect.top);

      // Convert to percentage of canvas
      const percentX = offsetX / rect.width;
      const percentY = offsetY / rect.height;

      // Calculate current center of view
      const currentCenterX = viewBox.x + viewBox.width * percentX;
      const currentCenterY = viewBox.y + viewBox.height * percentY;

      // Calculate new viewBox width and height
      const newWidth = width / newZoom;
      const newHeight = height / newZoom;

      // Calculate new viewBox x and y to keep mouse position at same point
      const newX = currentCenterX - percentX * newWidth;
      const newY = currentCenterY - percentY * newHeight;

      setViewBox({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    }
  };

  // Handle pan with mouse or touch
  const handlePanStart = (e) => {
    // Only start panning with space+drag, middle mouse, or when pan tool is selected
    if ((e.buttons === 1 && (e.altKey || e.buttons === 4 || currentTool === 'pan')) && !isPanning) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();

      // Change cursor
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
      }
    }
  };

  const handlePanMove = (e) => {
    if (isPanning && lastPanPoint) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;

      if (deltaX !== 0 || deltaY !== 0) {
        panCanvas(deltaX, deltaY);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      }
      e.preventDefault();
    }
  };

  const handlePanEnd = (e) => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);

      // Restore cursor
      if (containerRef.current) {
        containerRef.current.style.cursor = currentTool === 'pan' ? 'grab' : 'default';
      }
    }
  };

  // Handle keyboard shortcuts for zoom
  const handleKeyDown = (e) => {
    // Prevent default zoom behavior in browser
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=')) {
      e.preventDefault();
    }

    // Handle Space key for temporary pan tool
    if (e.code === 'Space' && !isPanning && containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  const handleKeyUp = (e) => {
    // Restore cursor when space is released
    if (e.code === 'Space' && containerRef.current && !isPanning) {
      containerRef.current.style.cursor = currentTool === 'pan' ? 'grab' : 'default';
    }
  };

  // Attach zoom and pan event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      container.addEventListener('mousedown', handlePanStart);
      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanEnd);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      // Set initial cursor for pan tool
      if (currentTool === 'pan') {
        container.style.cursor = 'grab';
      }
      return () => {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('mousedown', handlePanStart);
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanEnd);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [handleWheel, handlePanStart, handlePanMove, handlePanEnd, currentTool, isPanning]);

  // Canvas control methods
  const loadDrawingData = (vectorData) => {
    if (!engineRef.current || !vectorData) {
      console.warn('No engine or vector data to load');
      return false;
    }
  
    try {
      console.log('Loading drawing data, paths count before:', engineRef.current.getPaths().length);
      
      // Import the JSON data
      const success = engineRef.current.importFromJSON(vectorData);
      
      if (success) {
        console.log('Import successful, paths count after:', engineRef.current.getPaths().length);
        const currentPaths = engineRef.current.getPaths();
        
        // Update state directly without callback side effects
        setPaths([...currentPaths]);
        
        // Update store with loaded data - IMMEDIATE UPDATE
        const freshData = engineRef.current.exportAsJSON();
        console.log('SmoothCanvas: Updating store with loaded data');
        setCanvasData(freshData);
      } else {
        console.warn('Import failed');
      }
  
      return success;
    } catch (error) {
      console.error('Error loading drawing data:', error);
      return false;
    }
  };

  const exportImage = async (format = 'png') => {
    if (engineRef.current) {
      return engineRef.current.exportAsDataUrl(format, true);
    }
    return '';
  };

  const clearCanvas = () => {
    if (engineRef.current) {
      console.log('Clearing canvas');
      engineRef.current.clearPaths();
      setPaths([]);
      setPathsToErase(new Set());

      // Remove temp path
      const svg = svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      if (tempPath) tempPath.remove();

      // Update store immediately
      if (isInitialized) {
        const emptyCanvasData = engineRef.current.exportAsJSON();
        console.log('SmoothCanvas: Updating store after clear');
        setCanvasData(emptyCanvasData);
      }
    }
  };

  const undo = () => {
    if (engineRef.current) {
      console.log('Undoing last action');
      const success = engineRef.current.undo();
      if (success) {
        setPaths([...engineRef.current.getPaths()]);

        if (isInitialized) {
          const updatedCanvasData = engineRef.current.exportAsJSON();
          console.log('SmoothCanvas: Updating store after undo');
          setCanvasData(updatedCanvasData);
        }
      }
      return success;
    }
    return false;
  };

  const dpr = window.devicePixelRatio || 1;

  return (
    <div
      ref={containerRef}
      className={`${styles.canvasContainer} ${styles[`${currentTool}Mode`]} ${isPanning ? styles.panningMode : ''}`}
      style={{ width, height }}
    >
      {/* Background Pattern - should scale with zoom */}
      <div
        className={styles.pattern_background}
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: '0 0',
          width: `${100 / zoomLevel}%`,
          height: `${100 / zoomLevel}%`
        }}
      ></div>

      {/* Canvas - handles all drawing events */}
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
          pointerEvents: currentTool === 'pan' || isPanning ? 'none' : 'auto'
        }}
      />

      {/* SVG for vector drawing */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className={styles.svg}
        style={{
          pointerEvents: 'none',
          shapeRendering: 'geometricPrecision',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1
        }}
      >
        {/* Main paths */}
        {rendererRef.current?.renderPaths(paths, pathsToErase)}
      </svg>

      {/* Eraser cursor */}
      {currentTool === 'eraser' && showEraser &&
        rendererRef.current?.renderEraserCursor(showEraser, eraserPosition, eraserWidth / zoomLevel)}

      {/* Zoom indicator */}
      <div className={styles.zoomIndicator}>
        {Math.round(zoomLevel * 100)}%
      </div>
    </div>
  );
};

export default SmoothCanvas;