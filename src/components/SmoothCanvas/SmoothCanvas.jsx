// src/components/SmoothCanvas/SmoothCanvas.jsx
import React, { useRef, useEffect, useState } from 'react';
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
    setCanvasData,
    registerCanvasMethods
  } = useDrawingStore();
  
  const { currentPageData, savePage } = usePageStore();
  
  // Local refs for DOM elements
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  
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

  // Get dimensions from store
  const { width, height } = canvasDimensions;

  // Load canvas data when page changes
  useEffect(() => {
    if (isInitialized && engineRef.current && currentPageData?.canvasData) {
      loadDrawingData(currentPageData.canvasData);
    }
  }, [currentPageData?.id, isInitialized]);

  // Initialize canvas engine
  useEffect(() => {
    if (!canvasRef.current || !svgRef.current) return;

    const engine = new CanvasEngine(canvasRef, svgRef, {
      width,
      height,
      strokeColor,
      strokeWidth,
      eraserWidth
    });

    const eventHandler = new EventHandler(engine, {
      currentTool,
      strokeColor,
      strokeWidth,
      eraserWidth
    });

    const renderer = new CanvasRenderer(engine);

    // Set callbacks
    eventHandler.setCallbacks({
      onStrokeComplete: () => {
        setPaths([...engine.getPaths()]);
        if (isInitialized) {
          const canvasData = engine.exportAsJSON();
          
          // Update drawing store with new canvas data
          setCanvasData(canvasData);
          
          // Save to page if we have current page data
          if (currentPageData) {
            savePage({
              ...currentPageData,
              canvasData
            });
          }
        }
      },
      onPathsErased: () => {
        setPaths([...engine.getPaths()]);
        if (isInitialized) {
          const canvasData = engine.exportAsJSON();
          
          setCanvasData(canvasData);
          
          if (currentPageData) {
            savePage({
              ...currentPageData,
              canvasData
            });
          }
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
    
    // Register canvas methods with the store
    registerCanvasMethods({
      clearCanvas: clearCanvas,
      exportImage: exportImage,
      undo: undo
    });
    
    setIsInitialized(true);

    return () => {
      if (eventHandlerRef.current && canvasRef.current) {
        eventHandlerRef.current.detachListeners(canvasRef.current);
      }
    };
  }, [width, height, setCanvasData, registerCanvasMethods]);

  // Update options when store state changes
  useEffect(() => {
    if (engineRef.current && eventHandlerRef.current && isInitialized) {
      engineRef.current.updateOptions({
        width,
        height,
        strokeColor,
        strokeWidth,
        eraserWidth
      });

      eventHandlerRef.current.options = {
        ...eventHandlerRef.current.options,
        currentTool,
        strokeColor,
        strokeWidth,
        eraserWidth
      };

      engineRef.current.isErasing = currentTool === 'eraser';
      
      if (currentTool !== 'eraser') {
        setPathsToErase(new Set());
        setShowEraser(false);
      }
    }
  }, [currentTool, strokeColor, strokeWidth, eraserWidth, width, height, isInitialized]);

  // Canvas control methods
  const loadDrawingData = (vectorData) => {
    if (!engineRef.current || !vectorData) {
      return false;
    }
    
    try {
      const wasInitialized = isInitialized;
      setIsInitialized(false);
      
      const success = engineRef.current.importFromJSON(vectorData);
      
      if (success) {
        const currentPaths = engineRef.current.getPaths();
        setPaths([...currentPaths]);
      }
      
      setTimeout(() => {
        setIsInitialized(wasInitialized);
      }, 100);
      
      return success;
    } catch (error) {
      console.error('Error loading drawing data:', error);
      setIsInitialized(true);
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
      engineRef.current.clearPaths();
      setPaths([]);
      setPathsToErase(new Set());
      
      // Remove temp path
      const svg = svgRef.current;
      const tempPath = svg?.querySelector('#temp-path');
      if (tempPath) tempPath.remove();

      // Save empty canvas state
      if (isInitialized) {
        const emptyCanvasData = engineRef.current.exportAsJSON();
        
        setCanvasData(emptyCanvasData);
        
        if (currentPageData) {
          savePage({
            ...currentPageData,
            canvasData: emptyCanvasData
          });
        }
      }
    }
  };

  const undo = () => {
    if (engineRef.current) {
      const success = engineRef.current.undo();
      if (success) {
        setPaths([...engineRef.current.getPaths()]);
        
        if (isInitialized) {
          const updatedCanvasData = engineRef.current.exportAsJSON();
          
          setCanvasData(updatedCanvasData);
          
          if (currentPageData) {
            savePage({
              ...currentPageData,
              canvasData: updatedCanvasData
            });
          }
        }
      }
      return success;
    }
    return false;
  };

  const dpr = window.devicePixelRatio || 1;

  return (
    <div
      className={`${styles.canvasContainer} ${styles[`${currentTool}Mode`]}`}
      style={{ width, height }}
    >
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
          pointerEvents: 'auto'
        }}
      />

      {/* SVG for vector drawing */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
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
        rendererRef.current?.renderEraserCursor(showEraser, eraserPosition, eraserWidth)}
    </div>
  );
};

export default SmoothCanvas;