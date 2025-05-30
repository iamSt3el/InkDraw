// src/components/SmoothCanvas/SmoothCanvas.jsx - COMPLETE VERSION WITH AI INTEGRATION
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasEngine } from './core/CanvasEngine';
import { EventHandler } from './core/EventHandler';
import { CanvasRenderer } from './core/CanvasRenderer';
import { useDrawingStore } from '../../stores/drawingStore';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';
import aiProcessingService from '../../services/AIProcessingService';
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
    clearSelection,
    // AI properties - NEW
    aiTextSettings,
    isAiProcessing,
    setAiProcessing,
    addAiStroke,
    clearAiProcessing,
    startAiProcessingTimer,
    shouldStartNewWord
  } = useDrawingStore();

  const { currentPageData } = usePageStore();
  const { showNotification } = useUIStore();

  // Refs
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const eventHandlerRef = useRef(null);
  const rendererRef = useRef(null);
  
  const isDraggingSelectionRef = useRef(false);
  const aiProcessingQueueRef = useRef([]); // NEW: Queue for AI processing

  // State
  const [paths, setPaths] = useState([]);
  const [pathsToErase, setPathsToErase] = useState(new Set());
  const [eraserPosition, setEraserPosition] = useState({ x: 0, y: 0 });
  const [showEraser, setShowEraser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // NEW: AI-specific state
  const [aiProcessingState, setAiProcessingState] = useState({
    isProcessing: false,
    currentStroke: null,
    processingFeedback: null
  });

  const { width, height } = canvasDimensions;

  // Get current canvas data (MOVED UP)
  const getCurrentCanvasData = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.exportAsJSON();
    }
    return null;
  }, []);

  // Update canvas data when content changes (MOVED UP)
  const updateCanvasData = useCallback(() => {
    if (engineRef.current && isInitialized) {
      const data = getCurrentCanvasData();
      setCanvasData(data);
    }
  }, [getCurrentCanvasData, setCanvasData, isInitialized]);

  // NEW: AI Handwriting Processing
  const processAIHandwriting = useCallback(async (strokeData) => {
    console.log('SmoothCanvas: Processing AI handwriting...');
    
    if (!strokeData || !strokeData.points || strokeData.points.length < 2) {
      console.warn('SmoothCanvas: Insufficient stroke data for AI processing');
      return;
    }

    try {
      setAiProcessing(true);
      setAiProcessingState(prev => ({ ...prev, isProcessing: true }));

      // Show processing feedback
      if (rendererRef.current) {
        rendererRef.current.renderAIProcessingFeedback(strokeData.bounds, true);
      }

      // Extract coordinates in the format expected by the AI service
      const coordinates = strokeData.points.map(point => ({
        x: point.x,
        y: point.y,
        timestamp: point.timestamp || Date.now()
      }));

      console.log('SmoothCanvas: Sending to AI service:', {
        pointCount: coordinates.length,
        bounds: strokeData.bounds
      });

      // FLASK INTEGRATION: Process with AI service
      const result = await aiProcessingService.processHandwriting(coordinates, strokeData.bounds, {
        enableFallback: true // Enable fallback for development
      });

      if (result.success && result.recognizedText) {
        console.log('SmoothCanvas: AI recognition successful:', result.recognizedText);
        
        // Clear processing feedback
        if (rendererRef.current) {
          rendererRef.current.clearAIProcessingFeedback();
        }

        // Create AI text element
        await createAITextElement(result, strokeData.bounds);
        
        // Show success notification
        if (showNotification) {
          const confidencePercent = Math.round(result.confidence * 100);
          const message = result.metadata?.hasCorrections 
            ? `Recognized: "${result.recognizedText}" (corrected, ${confidencePercent}% confidence)`
            : `Recognized: "${result.recognizedText}" (${confidencePercent}% confidence)`;
          showNotification('success', message);
        }

      } else {
        throw new Error(result.error || 'AI processing failed');
      }

    } catch (error) {
      console.error('SmoothCanvas: AI processing error:', error);
      
      // Clear processing feedback
      if (rendererRef.current) {
        rendererRef.current.clearAIProcessingFeedback();
      }
      
      // Show error notification with helpful message
      if (showNotification) {
        let errorMessage = 'AI processing failed';
        if (error.message.includes('not available')) {
          errorMessage = 'Flask server not running. Start your Flask server at http://127.0.0.1:5000';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'AI processing timed out. Check your Flask server.';
        } else {
          errorMessage = `AI processing failed: ${error.message}`;
        }
        showNotification('error', errorMessage);
      }
    } finally {
      setAiProcessing(false);
      setAiProcessingState(prev => ({ ...prev, isProcessing: false }));
      clearAiProcessing();
    }
  }, [setAiProcessing, clearAiProcessing, showNotification]);

  // NEW: Create AI text element
  const createAITextElement = useCallback(async (aiResult, bounds) => {
    console.log('SmoothCanvas: Creating AI text element...');
    
    if (!engineRef.current || !rendererRef.current) {
      console.error('SmoothCanvas: Engine or renderer not available');
      return;
    }

    try {
      // Get effective text color (use stroke color if textColor is null)
      const effectiveTextColor = aiTextSettings.textColor || strokeColor;
      
      // Calculate text position based on bounds and alignment
      let textX = bounds.x;
      const textY = bounds.centerY; // Center vertically in the stroke bounds
      
      // Adjust X position based on text alignment
      switch (aiTextSettings.textAlign) {
        case 'center':
          textX = bounds.centerX;
          break;
        case 'right':
          textX = bounds.x + bounds.width;
          break;
        case 'left':
        default:
          textX = bounds.x;
          break;
      }

      // Create AI text object
      const aiTextElement = {
        id: engineRef.current.generatePathId(),
        type: 'aiText',
        text: aiResult.recognizedText,
        x: textX,
        y: textY,
        fontFamily: aiTextSettings.fontFamily,
        fontSize: aiTextSettings.fontSize,
        fontWeight: aiTextSettings.fontWeight,
        color: effectiveTextColor,
        textAlign: aiTextSettings.textAlign,
        bounds: bounds,
        confidence: aiResult.confidence,
        timestamp: Date.now(),
        metadata: {
          rawPrediction: aiResult.rawPrediction,
          spellChecked: aiResult.spellChecked,
          processingTime: aiResult.metadata?.processingTime
        }
      };

      console.log('SmoothCanvas: Adding AI text element to engine:', aiTextElement);

      // Add to engine paths
      engineRef.current.paths.push(aiTextElement);

      // Render the text element
      rendererRef.current.renderAITextElement(aiTextElement);

      // Update paths state
      const currentPaths = engineRef.current.getPaths();
      setPaths([...currentPaths]);

      // Update canvas data
      updateCanvasData();

      console.log('SmoothCanvas: AI text element created successfully');

    } catch (error) {
      console.error('SmoothCanvas: Error creating AI text element:', error);
    }
  }, [aiTextSettings, strokeColor, updateCanvasData]);

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
        
        // Re-render AI text elements if any
        if (rendererRef.current) {
          rendererRef.current.renderAITextElements();
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error loading canvas data:', error);
      return false;
    }
  }, []);

  // Get current canvas data (REMOVED - MOVED UP)

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
      const tempAiPath = svg?.querySelector('#temp-ai-path'); // NEW: Clear AI temp path
      if (tempPath) tempPath.remove();
      if (tempRect) tempRect.remove();
      if (tempAiPath) tempAiPath.remove(); // NEW

      if (rendererRef.current) {
        rendererRef.current.clearRenderedShapes();
        rendererRef.current.clearAITextElements(); // NEW: Clear AI text elements
        rendererRef.current.clearAIProcessingFeedback(); // NEW: Clear AI feedback
      }

      // Update canvas data immediately
      const emptyData = getCurrentCanvasData();
      setCanvasData(emptyData);
      
      // NEW: Clear AI processing state
      clearAiProcessing();
      
      return true;
    }
    return false;
  }, [getCurrentCanvasData, setCanvasData, clearAiProcessing]);

  // Update canvas data when content changes (REMOVED - MOVED UP)

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

  // NEW: AI stroke event handlers
  const handleAIStrokeStart = useCallback((point) => {
    console.log('SmoothCanvas: AI stroke started');
    setAiProcessingState(prev => ({
      ...prev,
      currentStroke: { startPoint: point, points: [point] }
    }));
  }, []);

  const handleAIStrokeUpdate = useCallback((point) => {
    setAiProcessingState(prev => {
      if (prev.currentStroke) {
        return {
          ...prev,
          currentStroke: {
            ...prev.currentStroke,
            points: [...prev.currentStroke.points, point]
          }
        };
      }
      return prev;
    });
  }, []);

  const combineNearbyStrokes = useCallback((strokes) => {
    if (strokes.length === 1) {
      return strokes[0];
    }

    // Combine all points and calculate overall bounds
    let allPoints = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    strokes.forEach(stroke => {
      allPoints = allPoints.concat(stroke.points);
      if (stroke.bounds) {
        minX = Math.min(minX, stroke.bounds.x);
        minY = Math.min(minY, stroke.bounds.y);
        maxX = Math.max(maxX, stroke.bounds.x + stroke.bounds.width);
        maxY = Math.max(maxY, stroke.bounds.y + stroke.bounds.height);
      }
    });

    const combinedBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };

    return {
      points: allPoints,
      bounds: combinedBounds,
      duration: strokes.reduce((total, stroke) => total + (stroke.duration || 0), 0),
      timestamp: Math.min(...strokes.map(s => s.timestamp))
    };
  }, []);

  const handleAIStrokeComplete = useCallback((strokeData) => {
    console.log('SmoothCanvas: AI stroke completed, processing...');
    
    // Add to processing queue
    aiProcessingQueueRef.current.push(strokeData);
    
    // Clear any existing timer
    if (aiProcessingQueueRef.current.timer) {
      clearTimeout(aiProcessingQueueRef.current.timer);
    }
    
    // Start new timer
    aiProcessingQueueRef.current.timer = setTimeout(() => {
      console.log('Timer callback executing...'); // Debug log
      const strokesToProcess = [...aiProcessingQueueRef.current];
      aiProcessingQueueRef.current = []; // Clear queue
      
      console.log('Strokes to process:', strokesToProcess.length); // Debug log
      
      if (strokesToProcess.length > 0) {
        const combinedStroke = combineNearbyStrokes(strokesToProcess);
        processAIHandwriting(combinedStroke);
      }
    }, 1000);
    
  }, [processAIHandwriting, combineNearbyStrokes]);
  // NEW: Combine nearby strokes into words
 

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

    // Set callbacks including AI callbacks
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
      onSelectionDragEnd: handleSelectionDragEnd,
      // NEW: AI callbacks
      onAIStrokeStart: handleAIStrokeStart,
      onAIStrokeUpdate: handleAIStrokeUpdate,
      onAIStrokeComplete: handleAIStrokeComplete
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
      // NEW: Clear AI processing queue
      aiProcessingQueueRef.current = [];
    };
  }, []); // Initialize only once

  // Update canvas dimensions
  useEffect(() => {
    if (engineRef.current && isInitialized) {
      engineRef.current.updateOptions({ width, height });
    }
  }, [width, height, isInitialized]);

  // Update tool options including AI settings
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

      // NEW: Clear AI processing when switching away from AI tool
      if (currentTool !== 'aiHandwriting') {
        clearAiProcessing();
        if (rendererRef.current) {
          rendererRef.current.clearAIProcessingFeedback();
        }
        aiProcessingQueueRef.current = [];
      }
    }
  }, [currentTool, strokeColor, strokeWidth, opacity, eraserWidth, viewBox, zoomLevel,
    shapeColor, shapeBorderSize, shapeFill, shapeFillColor, shapeRoundCorners,
    isInitialized, selectedItems, clearSelection, clearAiProcessing]);

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
      case 'aiHandwriting': return 'crosshair'; // NEW: AI tool cursor
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

      {/* NEW: AI tool cursor */}
      {currentTool === 'aiHandwriting' && rendererRef.current?.renderAIToolCursor(true, eraserPosition)}

      <div className={styles.zoomIndicator}>
        {Math.round(zoomLevel * 100)}%
      </div>

      {currentTool === 'select' && selectedItems.size > 0 && (
        <div className={styles.selectionInfo}>
          {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
        </div>
      )}

      {/* NEW: AI processing indicator */}
      {currentTool === 'aiHandwriting' && isAiProcessing && (
        <div className={styles.aiProcessingInfo}>
          <div className={styles.aiSpinner}></div>
          <span>Converting handwriting...</span>
        </div>
      )}
    </div>
  );
};

export default SmoothCanvas;