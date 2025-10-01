// src/components/SmoothCanvas/SmoothCanvas.jsx - COMPLETE VERSION WITH FIXED SELECTION OVERLAY
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
    // AI properties
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
  const aiProcessingQueueRef = useRef([]);

  // State
  const [paths, setPaths] = useState([]);
  const [pathsToErase, setPathsToErase] = useState(new Set());
  const [eraserPosition, setEraserPosition] = useState({ x: 0, y: 0 });
  const [showEraser, setShowEraser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // FIXED: Selection overlay state
  const [selectionOverlay, setSelectionOverlay] = useState({
    isSelecting: false,
    selectionRect: null,
    selectionBounds: null
  });

  // AI-specific state
  const [aiProcessingState, setAiProcessingState] = useState({
    isProcessing: false,
    currentStroke: null,
    processingFeedback: null
  });

  const { width, height } = canvasDimensions;

  // Get current canvas data
  const getCurrentCanvasData = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.exportAsJSON();
    }
    return null;
  }, []);

  // Update canvas data when content changes
  const updateCanvasData = useCallback(() => {
    if (engineRef.current && isInitialized) {
      const data = getCurrentCanvasData();
      setCanvasData(data);
    }
  }, [getCurrentCanvasData, setCanvasData, isInitialized]);

  // Process AI handwriting
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

      console.log('SmoothCanvas: Sending simple coordinates to AI service:', {
        pointCount: strokeData.points.length,
        bounds: strokeData.bounds,
        samplePoints: strokeData.points.slice(0, 3),
        coordinateSystem: 'simple_canvas'
      });

      const result = await aiProcessingService.processHandwriting(strokeData.points, strokeData.bounds, {
        enableFallback: true,
        useSpellCheck: true
      });

      if (result.success && result.recognizedText) {
        console.log('SmoothCanvas: AI recognition successful:', {
          recognizedText: result.recognizedText,
          rawPrediction: result.rawPrediction,
          hasCorrections: result.metadata?.hasCorrections
        });

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
            ? `Recognized: "${result.recognizedText}" (spell-corrected, ${confidencePercent}% confidence)`
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

  // Create AI text element
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
      const tempAiPath = svg?.querySelector('#temp-ai-path');
      if (tempPath) tempPath.remove();
      if (tempRect) tempRect.remove();
      if (tempAiPath) tempAiPath.remove();

      if (rendererRef.current) {
        rendererRef.current.clearRenderedShapes();
        rendererRef.current.clearAITextElements();
        rendererRef.current.clearAIProcessingFeedback();
      }

      // Update canvas data immediately
      const emptyData = getCurrentCanvasData();
      setCanvasData(emptyData);

      // Clear AI processing state
      clearAiProcessing();

      // FIXED: Clear selection overlay
      setSelectionOverlay({
        isSelecting: false,
        selectionRect: null,
        selectionBounds: null
      });

      return true;
    }
    return false;
  }, [getCurrentCanvasData, setCanvasData, clearAiProcessing]);

  // Handle pan events
  const handlePan = useCallback((deltaX, deltaY) => {
    panCanvas(deltaX, deltaY);
  }, [panCanvas]);

  // Handle zoom events
  const handleZoom = useCallback((zoomDelta, center) => {
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomDelta));
    setZoomLevel(newZoom);
  }, [zoomLevel, setZoomLevel]);

  // FIXED: Selection event handlers with overlay updates
  const handleSelectionChanged = useCallback((selectedItemIds) => {
    console.log('SmoothCanvas: Selection changed:', selectedItemIds);
    setSelection(selectedItemIds);

    if (engineRef.current) {
      engineRef.current.setSelectedItems(selectedItemIds);
      
      // Update selection overlay state
      const bounds = engineRef.current.getSelectionBounds(selectedItemIds);
      console.log('SmoothCanvas: Selection bounds:', bounds);
      setSelectionOverlay(prev => ({
        ...prev,
        selectionBounds: bounds
      }));
      
      // Force renderer update
      if (rendererRef.current) {
        rendererRef.current.renderPaths();
      }
    }

    const currentPaths = engineRef.current.getPaths();
    setPaths([...currentPaths]);
    
    // Force canvas data update to trigger re-render
    updateCanvasData();
  }, [setSelection, updateCanvasData]);

  // FIXED: New selection rect changed handler
  const handleSelectionRectChanged = useCallback((rect) => {
    console.log('SmoothCanvas: Selection rect changed:', rect);
    setSelectionOverlay(prev => ({
      ...prev,
      isSelecting: true,
      selectionRect: rect
    }));
  }, []);

  const handleSelectionMoved = useCallback((selectedItemIds) => {
    updateCanvasData();
    const currentPaths = engineRef.current.getPaths();
    setPaths([...currentPaths]);
    
    // Update selection bounds after move
    if (engineRef.current) {
      const bounds = engineRef.current.getSelectionBounds(selectedItemIds);
      setSelectionOverlay(prev => ({
        ...prev,
        selectionBounds: bounds
      }));
      
      // Force renderer update for images
      if (rendererRef.current) {
        rendererRef.current.renderPaths();
      }
    }
  }, [updateCanvasData]);

  const handleSelectionResized = useCallback((selectedItemIds) => {
    updateCanvasData();
    const currentPaths = engineRef.current.getPaths();
    setPaths([...currentPaths]);
    
    // Update selection bounds after resize
    if (engineRef.current) {
      const bounds = engineRef.current.getSelectionBounds(selectedItemIds);
      setSelectionOverlay(prev => ({
        ...prev,
        selectionBounds: bounds
      }));
      
      // Force renderer update for images
      if (rendererRef.current) {
        rendererRef.current.renderPaths();
      }
    }
  }, [updateCanvasData]);

  const handleSelectionDragStart = useCallback(() => {
    isDraggingSelectionRef.current = true;
  }, []);

  const handleSelectionDragEnd = useCallback(() => {
    isDraggingSelectionRef.current = false;
    updateCanvasData();
    
    // Clear area selection overlay when drag ends
    setSelectionOverlay(prev => ({
      ...prev,
      isSelecting: false,
      selectionRect: null
    }));
  }, [updateCanvasData]);

  // AI stroke event handlers
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
      const strokesToProcess = [...aiProcessingQueueRef.current];
      aiProcessingQueueRef.current = [];

      if (strokesToProcess.length > 0) {
        const combinedStroke = combineNearbyStrokes(strokesToProcess);
        processAIHandwriting(combinedStroke);
      }
    }, 1000);
  }, [processAIHandwriting, combineNearbyStrokes]);

  // Helper function for resize handle cursors
  const getHandleCursor = useCallback((handleName) => {
    const cursors = {
      'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize',
      'e': 'e-resize', 'se': 'se-resize', 's': 's-resize',
      'sw': 'sw-resize', 'w': 'w-resize'
    };
    return cursors[handleName] || 'default';
  }, []);

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

    // FIXED: Set callbacks including selection rect callback
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
      // FIXED: Add selection rect changed callback
      onSelectionRectChanged: handleSelectionRectChanged,
      // AI callbacks
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
      },
      addImage: async (imageData) => {
        if (engineRef.current) {
          try {
            const imageElement = await engineRef.current.addImageElement(imageData);
            const newPaths = [...engineRef.current.getPaths()];
            setPaths(newPaths);
            updateCanvasData();
            return imageElement;
          } catch (error) {
            console.error('SmoothCanvas: Failed to add image:', error);
            throw error;
          }
        }
        throw new Error('Canvas engine not available');
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
        // FIXED: Clear selection overlay when switching tools
        setSelectionOverlay({
          isSelecting: false,
          selectionRect: null,
          selectionBounds: null
        });
      }

      // Clear AI processing when switching away from AI tool
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
        
        // Update selection overlay bounds
        const bounds = engineRef.current.getSelectionBounds(storeSelectedArray);
        setSelectionOverlay(prev => ({
          ...prev,
          selectionBounds: bounds
        }));
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
      case 'aiHandwriting': return 'crosshair';
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

      {/* FIXED: Selection overlay SVG */}
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
        {/* FIXED: Manual selection overlay rendering */}
        {currentTool === 'select' && selectionOverlay.isSelecting && selectionOverlay.selectionRect && (
          <rect
            x={selectionOverlay.selectionRect.x}
            y={selectionOverlay.selectionRect.y}
            width={selectionOverlay.selectionRect.width}
            height={selectionOverlay.selectionRect.height}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="rgba(59, 130, 246, 0.8)"
            strokeWidth="2"
            strokeDasharray="4,4"
            style={{ 
              pointerEvents: 'none',
              animation: 'selectionPulse 1.5s ease-in-out infinite'
            }}
          />
        )}
        
        {/* Selection bounds and handles */}
        {currentTool === 'select' && selectionOverlay.selectionBounds && selectedItems.size > 0 && (
          <g>
            {/* Selection bounds rectangle */}
            <rect
              x={selectionOverlay.selectionBounds.x - 3}
              y={selectionOverlay.selectionBounds.y - 3}
              width={selectionOverlay.selectionBounds.width + 6}
              height={selectionOverlay.selectionBounds.height + 6}
              fill="none"
              stroke="rgba(59, 130, 246, 0.9)"
              strokeWidth="2"
              strokeDasharray="6,6"
              style={{ 
                pointerEvents: 'none',
                animation: 'selectionBoundsPulse 2s ease-in-out infinite'
              }}
            />
            
            {/* Resize handles */}
            {engineRef.current && (() => {
              const handles = engineRef.current.getResizeHandles(selectionOverlay.selectionBounds);
              return Object.entries(handles).map(([name, handle]) => (
                <g key={`handle-${name}`}>
                  {/* Handle background */}
                  <circle
                    cx={handle.x}
                    cy={handle.y}
                    r="8"
                    fill="white"
                    stroke="rgba(59, 130, 246, 0.9)"
                    strokeWidth="2"
                    style={{ 
                      cursor: getHandleCursor(name),
                      pointerEvents: 'auto',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                    }}
                  />
                  {/* Handle center dot */}
                  <circle
                    cx={handle.x}
                    cy={handle.y}
                    r="3"
                    fill="rgba(59, 130, 246, 0.9)"
                    style={{ 
                      cursor: getHandleCursor(name),
                      pointerEvents: 'auto'
                    }}
                  />
                </g>
              ));
            })()}
          </g>
        )}
      </svg>

      {currentTool === 'eraser' && showEraser &&
        rendererRef.current?.renderEraserCursor(showEraser, eraserPosition, eraserWidth / zoomLevel)}

      {/* AI tool cursor */}
      {currentTool === 'aiHandwriting' && rendererRef.current?.renderAIToolCursor(true, eraserPosition)}

      <div className={styles.zoomIndicator}>
        {Math.round(zoomLevel * 100)}%
      </div>

      {currentTool === 'select' && selectedItems.size > 0 && (
        <div className={styles.selectionInfo}>
          {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
        </div>
      )}

      {/* AI processing indicator */}
      {currentTool === 'aiHandwriting' && isAiProcessing && (
        <div className={styles.aiProcessingInfo}>
          <div className={styles.aiSpinner}></div>
          <span>Converting handwriting...</span>
        </div>
      )}

      {/* FIXED: Debug overlay for selection state */}
      {currentTool === 'select' && process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 1000,
          maxWidth: '300px'
        }}>
          <div>Tool: {currentTool}</div>
          <div>Is Selecting: {selectionOverlay.isSelecting ? 'Yes' : 'No'}</div>
          <div>Selection Rect: {selectionOverlay.selectionRect ? 
            `${Math.round(selectionOverlay.selectionRect.width)}x${Math.round(selectionOverlay.selectionRect.height)}` : 
            'None'}</div>
          <div>Selected Items: {selectedItems.size}</div>
          <div>Selection Bounds: {selectionOverlay.selectionBounds ? 
            `${Math.round(selectionOverlay.selectionBounds.width)}x${Math.round(selectionOverlay.selectionBounds.height)}` : 
            'None'}</div>
          <div>Total Paths: {paths.length}</div>
        </div>
      )}
    </div>
  );
};

export default SmoothCanvas;