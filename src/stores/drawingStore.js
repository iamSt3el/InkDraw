// src/stores/drawingStore.js - FIXED VERSION
import { create } from 'zustand';

// Valid pattern types
const VALID_PATTERNS = ['blank', 'grid', 'dots', 'lines', 'graph'];

export const useDrawingStore = create((set, get) => ({
  // Tool state
  currentTool: 'pen',
  strokeColor: '#000000',
  strokeWidth: 5,
  opacity: 100,
  eraserWidth: 10,
  sketchyMode: false,
  shapeMode: false,
  
  // Canvas dimensions
  canvasDimensions: {
    width: 870,
    height: 870
  },
  
  // Zoom and Pan state
  zoomLevel: 1,
  viewBox: { x: 0, y: 0, width: 870, height: 870 },
  
  // Page settings
  pageSettings: {
    pattern: 'grid',
    patternSize: 20,
    patternColor: '#e5e7eb',
    patternOpacity: 50
  },
  
  // Canvas state
  canvasData: null,
  hasUnsavedChanges: false,
  
  setShapeMode: () => set(state => ({shapeMode: !state.shapeMode})),

  // Actions
  setTool: (tool) => {
    const validTools = ['pen', 'eraser', 'pointer', 'pan', 'rectangle'];
    if (validTools.includes(tool)) {
      set({ currentTool: tool });
    } else {
      console.warn(`Invalid tool: ${tool}`);
    }
  },
  
  setStrokeColor: (color) => {
    // Basic validation that it's a string and looks like a color
    if (typeof color === 'string' && (color.startsWith('#') || color.startsWith('rgb'))) {
      set({ strokeColor: color });
    } else {
      console.warn(`Invalid stroke color: ${color}`);
    }
  },
  
  setStrokeWidth: (width) => {
    // Validate width is within reasonable range (1-50px)
    const validWidth = Math.max(1, Math.min(50, width));
    set({ strokeWidth: validWidth });
  },
  
  setOpacity: (opacity) => {
    // Validate opacity is between 0-100%
    const validOpacity = Math.max(0, Math.min(100, opacity));
    set({ opacity: validOpacity });
  },
  
  setEraserWidth: (width) => {
    // Validate width is within reasonable range
    const validWidth = Math.max(5, Math.min(100, width));
    set({ eraserWidth: validWidth });
  },
  
  setSketchyMode: (sketchyMode) => set({ sketchyMode: !!sketchyMode }),
  
  setCanvasDimensions: (dimensions) => set({
    canvasDimensions: dimensions
  }),
  
  // Zoom and Pan actions
  setZoomLevel: (level) => set(state => {
    const newZoom = Math.max(0.1, Math.min(5, level)); // Limit zoom range between 10% and 500%
    
    // Adjust viewBox when zoom changes to maintain center
    const { width, height } = state.canvasDimensions;
    const { x, y, width: vbWidth, height: vbHeight } = state.viewBox;
    
    // Calculate center point of current view
    const centerX = x + vbWidth / 2;
    const centerY = y + vbHeight / 2;
    
    // Calculate new dimensions based on new zoom
    const newWidth = width / newZoom;
    const newHeight = height / newZoom;
    
    // Calculate new viewBox position to keep center point
    const newX = centerX - newWidth / 2;
    const newY = centerY - newHeight / 2;
    
    return { 
      zoomLevel: newZoom,
      viewBox: {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      }
    };
  }),
  
  zoomIn: () => set(state => {
    const newZoom = Math.min(5, state.zoomLevel * 1.25);
    
    // Adjust viewBox when zoom changes to maintain center
    const { width, height } = state.canvasDimensions;
    const { x, y, width: vbWidth, height: vbHeight } = state.viewBox;
    
    // Calculate center point of current view
    const centerX = x + vbWidth / 2;
    const centerY = y + vbHeight / 2;
    
    // Calculate new dimensions based on new zoom
    const newWidth = width / newZoom;
    const newHeight = height / newZoom;
    
    // Calculate new viewBox position to keep center point
    const newX = centerX - newWidth / 2;
    const newY = centerY - newHeight / 2;
    
    return { 
      zoomLevel: newZoom,
      viewBox: {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      }
    };
  }),
  
  zoomOut: () => set(state => {
    const newZoom = Math.max(0.1, state.zoomLevel / 1.25);
    
    // Adjust viewBox when zoom changes to maintain center
    const { width, height } = state.canvasDimensions;
    const { x, y, width: vbWidth, height: vbHeight } = state.viewBox;
    
    // Calculate center point of current view
    const centerX = x + vbWidth / 2;
    const centerY = y + vbHeight / 2;
    
    // Calculate new dimensions based on new zoom
    const newWidth = width / newZoom;
    const newHeight = height / newZoom;
    
    // Calculate new viewBox position to keep center point
    const newX = centerX - newWidth / 2;
    const newY = centerY - newHeight / 2;
    
    return { 
      zoomLevel: newZoom,
      viewBox: {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      }
    };
  }),
  
  resetZoom: () => set(state => {
    const { width, height } = state.canvasDimensions;
    return { 
      zoomLevel: 1,
      viewBox: {
        x: 0,
        y: 0,
        width,
        height
      }
    };
  }),
  
  setViewBox: (viewBox) => set({ viewBox }),
  
  panCanvas: (deltaX, deltaY) => set(state => {
    const { x, y, width, height } = state.viewBox;
    // Scale delta by zoom level to make panning feel natural
    const scaledDeltaX = deltaX / state.zoomLevel;
    const scaledDeltaY = deltaY / state.zoomLevel;
    
    return {
      viewBox: {
        x: x - scaledDeltaX,
        y: y - scaledDeltaY,
        width,
        height
      }
    };
  }),
  
  // Page settings actions
  setPattern: (pattern) => {
    // Validate pattern type
    if (VALID_PATTERNS.includes(pattern)) {
      set(state => ({
        pageSettings: { ...state.pageSettings, pattern }
      }));
    } else {
      console.warn(`Invalid pattern type: ${pattern}`);
    }
  },
  
  setPatternSize: (size) => {
    // Validate size is within reasonable range
    const validSize = Math.max(5, Math.min(100, size));
    set(state => ({
      pageSettings: { ...state.pageSettings, patternSize: validSize }
    }));
  },
  
  setPatternColor: (color) => {
    // Basic validation that it's a string
    if (typeof color === 'string') {
      set(state => ({
        pageSettings: { ...state.pageSettings, patternColor: color }
      }));
    }
  },
  
  setPatternOpacity: (opacity) => {
    // Validate opacity is between 0-100
    const validOpacity = Math.max(0, Math.min(100, opacity));
    set(state => ({
      pageSettings: { ...state.pageSettings, patternOpacity: validOpacity }
    }));
  },
  
  // Canvas data actions - FIXED VERSION
  setCanvasData: (data) => {
    console.log('DrawingStore: Setting canvas data', data ? data.substring(0, 100) + '...' : 'null');
    set({ 
      canvasData: data,
      hasUnsavedChanges: true 
    });
  },
  
  markChangesSaved: () => {
    console.log('DrawingStore: Marking changes as saved');
    set({ hasUnsavedChanges: false });
  },
  
  // Method to request canvas actions (for components that don't have direct ref access)
  clearCanvas: null, // Will be set by SmoothCanvas
  exportCanvasImage: null, // Will be set by SmoothCanvas
  undoCanvas: null, // Will be set by SmoothCanvas
  getCurrentCanvasData: null, // ADDED: Will be set by SmoothCanvas
  
  // Register canvas methods (called by SmoothCanvas during initialization) - UPDATED
  registerCanvasMethods: (methods) => {
    console.log('DrawingStore: Registering canvas methods');
    set({
      clearCanvas: methods.clearCanvas,
      exportCanvasImage: methods.exportImage,
      undoCanvas: methods.undo,
      getCurrentCanvasData: methods.getCurrentCanvasData // ADDED
    });
  },
  
  // ADDED: Force update canvas data from engine
  forceUpdateCanvasData: () => {
    const { getCurrentCanvasData } = get();
    if (getCurrentCanvasData) {
      const freshData = getCurrentCanvasData();
      if (freshData) {
        console.log('DrawingStore: Force updating canvas data');
        set({ 
          canvasData: freshData,
          hasUnsavedChanges: true 
        });
      }
    }
  }
}));