// src/components/SmoothCanvas/SmoothCanvas.jsx - FIXED WITH PAN SUPPORT
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
    setViewBox
  } = useDrawingStore();

  const { currentPageData } = usePageStore();

  // Refs
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const eventHandlerRef = useRef(null);
  const rendererRef = useRef(null);

  // State
  const [paths, setPaths] = useState([]);
  const [pathsToErase, setPathsToErase] = useState(new Set());
  const [eraserPosition, setEraserPosition] = useState({ x: 0, y: 0 });
  const [showEraser, setShowEraser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const lastLoadedDataRef = useRef(null);
  const isLoadingDataRef = useRef(false);

  const { width, height } = canvasDimensions;

  // Load canvas data
  const loadCanvasData = useCallback((vectorData) => {
    if (!engineRef.current || !vectorData || isLoadingDataRef.current) return false;
    
    if (lastLoadedDataRef.current === vectorData) {
      console.log('SmoothCanvas: Skipping reload of same data');
      return true;
    }

    try {
      console.log('SmoothCanvas: Loading new canvas data...');
      isLoadingDataRef.current = true;
      
      engineRef.current.clearPaths();
      setPaths([]);
      
      const success = engineRef.current.importFromJSON(vectorData);
      
      if (success) {
        const currentPaths = engineRef.current.getPaths();
        setPaths([...currentPaths]);
        lastLoadedDataRef.current = vectorData;
        console.log('SmoothCanvas: Loaded', currentPaths.length, 'paths');
      }
      
      return success;
    } catch (error) {
      console.error('SmoothCanvas: Error loading canvas data:', error);
      return false;
    } finally {
      isLoadingDataRef.current = false;
    }
  }, []);

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
      if (tempPath) tempPath.remove();
      
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

  // Watch canvas data from store
  useEffect(() => {
    if (isInitialized && canvasData && canvasData !== lastLoadedDataRef.current) {
      console.log('SmoothCanvas: Canvas data changed in store, loading...');
      loadCanvasData(canvasData);
    }
  }, [canvasData, isInitialized, loadCanvasData]);

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
      viewBox
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

    // Set callbacks including pan support
    eventHandler.setCallbacks({
      onStrokeComplete: () => {
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
      // NEW: Pan callbacks
      onPan: handlePan,
      onZoom: handleZoom,
      onPanStart: () => {
        console.log('SmoothCanvas: Pan started');
      },
      onPanEnd: () => {
        console.log('SmoothCanvas: Pan ended');
      }
    });

    eventHandler.attachListeners(canvasRef.current);

    engineRef.current = engine;
    eventHandlerRef.current = eventHandler;
    rendererRef.current = renderer;

    // Register methods
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
      loadCanvasData: loadCanvasData
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
  }, []); // Empty dependency array - initialize only once

  // Update canvas dimensions
  useEffect(() => {
    if (engineRef.current && isInitialized && (width !== engineRef.current.options.width || height !== engineRef.current.options.height)) {
      console.log('SmoothCanvas: Updating canvas dimensions');
      engineRef.current.updateOptions({ width, height });
    }
  }, [width, height, isInitialized]);

  // Update tool options
  useEffect(() => {
    if (engineRef.current && eventHandlerRef.current && isInitialized) {
      // Update engine options
      engineRef.current.updateOptions({
        strokeColor,
        strokeWidth,
        opacity,
        eraserWidth,
        viewBox
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
    }
  }, [currentTool, strokeColor, strokeWidth, opacity, eraserWidth, viewBox, zoomLevel, isInitialized]);

  // Update SVG viewBox when viewBox changes
  useEffect(() => {
    if (svgRef.current && viewBox) {
      svgRef.current.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    }
  }, [viewBox]);

  const dpr = window.devicePixelRatio || 1;

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
          cursor: currentTool === 'pan' ? 'grab' : 
                 currentTool === 'pen' ? 'crosshair' :
                 currentTool === 'eraser' ? 'none' :
                 currentTool === 'rectangle' ? 'crosshair' : 'default'
        }}
      />

      {/* SVG */}
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
    </div>
  );
};

export default SmoothCanvas;