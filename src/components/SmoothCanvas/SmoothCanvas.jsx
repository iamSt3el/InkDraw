// ===============================
// src/components/SmoothCanvas/SmoothCanvas.jsx - SIMPLE VERSION
// ===============================
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
    setCanvasData,
    registerCanvasMethods,
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

  const { width, height } = canvasDimensions;

  // Get current canvas data
  const getCurrentCanvasData = useCallback(() => {
    if (engineRef.current) {
      const data = engineRef.current.exportAsJSON();
      console.log('Getting canvas data, length:', data?.length || 0);
      return data;
    }
    return null;
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    if (engineRef.current) {
      console.log('Clearing canvas');
      engineRef.current.clearPaths();
      setPaths([]);
      setPathsToErase(new Set());
      
      // Remove temp elements
      const svg = svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      if (tempPath) tempPath.remove();
      
      return true;
    }
    return false;
  }, []);

  // Load drawing data
  const loadDrawingData = useCallback((vectorData) => {
    if (!engineRef.current || !vectorData) return false;

    try {
      console.log('Loading drawing data...');
      
      // Clear first
      engineRef.current.clearPaths();
      setPaths([]);
      
      // Import data
      const success = engineRef.current.importFromJSON(vectorData);
      
      if (success) {
        const currentPaths = engineRef.current.getPaths();
        setPaths([...currentPaths]);
        console.log('Loaded', currentPaths.length, 'paths');
      }
      
      return success;
    } catch (error) {
      console.error('Error loading drawing data:', error);
      return false;
    }
  }, []);

  // Load canvas data when page data changes
  useEffect(() => {
    if (isInitialized && currentPageData?.canvasData) {
      console.log('Loading page data into canvas');
      loadDrawingData(currentPageData.canvasData);
    }
  }, [currentPageData?.canvasData, isInitialized, loadDrawingData]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !svgRef.current) return;

    console.log('Initializing canvas engine');
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
    });

    const renderer = new CanvasRenderer(engine);

    // Set callbacks
    eventHandler.setCallbacks({
      onStrokeComplete: () => {
        setPaths([...engine.getPaths()]);
        if (isInitialized) {
          const canvasData = engine.exportAsJSON();
          setCanvasData(canvasData);
        }
      },
      onPathsErased: () => {
        setPaths([...engine.getPaths()]);
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
            setPaths([...engineRef.current.getPaths()]);
            if (isInitialized) {
              const canvasData = engineRef.current.exportAsJSON();
              setCanvasData(canvasData);
            }
          }
          return success;
        }
        return false;
      },
      getCurrentCanvasData: getCurrentCanvasData
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
  }, [width, height, registerCanvasMethods, getCurrentCanvasData, clearCanvas, setCanvasData]);

  // Update options when store state changes
  useEffect(() => {
    if (engineRef.current && eventHandlerRef.current && isInitialized) {
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

      engineRef.current.isErasing = currentTool === 'eraser';

      if (currentTool !== 'eraser') {
        setPathsToErase(new Set());
        setShowEraser(false);
      }
    }
  }, [currentTool, strokeColor, strokeWidth, opacity, eraserWidth, width, height, viewBox, isInitialized]);

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
    </div>
  );
};

export default SmoothCanvas;