// ===============================
// src/stores/drawingStore.js - COMPLETE FIXED VERSION
// ===============================
import { create } from 'zustand';

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
  
  // FIXED: Enhanced canvas state management
  canvasData: null,
  hasUnsavedChanges: false,
  isDataLoading: false, // NEW: Track data loading state
  
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
    if (typeof color === 'string' && (color.startsWith('#') || color.startsWith('rgb'))) {
      set({ strokeColor: color });
    } else {
      console.warn(`Invalid stroke color: ${color}`);
    }
  },
  
  setStrokeWidth: (width) => {
    const validWidth = Math.max(1, Math.min(50, width));
    set({ strokeWidth: validWidth });
  },
  
  setOpacity: (opacity) => {
    const validOpacity = Math.max(0, Math.min(100, opacity));
    set({ opacity: validOpacity });
  },
  
  setEraserWidth: (width) => {
    const validWidth = Math.max(5, Math.min(100, width));
    set({ eraserWidth: validWidth });
  },
  
  setSketchyMode: (sketchyMode) => set({ sketchyMode: !!sketchyMode }),
  
  setCanvasDimensions: (dimensions) => set({
    canvasDimensions: dimensions
  }),
  
  // Zoom and Pan actions
  setZoomLevel: (level) => set(state => {
    const newZoom = Math.max(0.1, Math.min(5, level));
    
    const { width, height } = state.canvasDimensions;
    const { x, y, width: vbWidth, height: vbHeight } = state.viewBox;
    
    const centerX = x + vbWidth / 2;
    const centerY = y + vbHeight / 2;
    
    const newWidth = width / newZoom;
    const newHeight = height / newZoom;
    
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
    
    const { width, height } = state.canvasDimensions;
    const { x, y, width: vbWidth, height: vbHeight } = state.viewBox;
    
    const centerX = x + vbWidth / 2;
    const centerY = y + vbHeight / 2;
    
    const newWidth = width / newZoom;
    const newHeight = height / newZoom;
    
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
    
    const { width, height } = state.canvasDimensions;
    const { x, y, width: vbWidth, height: vbHeight } = state.viewBox;
    
    const centerX = x + vbWidth / 2;
    const centerY = y + vbHeight / 2;
    
    const newWidth = width / newZoom;
    const newHeight = height / newZoom;
    
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
    if (VALID_PATTERNS.includes(pattern)) {
      set(state => ({
        pageSettings: { ...state.pageSettings, pattern }
      }));
    } else {
      console.warn(`Invalid pattern type: ${pattern}`);
    }
  },
  
  setPatternSize: (size) => {
    const validSize = Math.max(5, Math.min(100, size));
    set(state => ({
      pageSettings: { ...state.pageSettings, patternSize: validSize }
    }));
  },
  
  setPatternColor: (color) => {
    if (typeof color === 'string') {
      set(state => ({
        pageSettings: { ...state.pageSettings, patternColor: color }
      }));
    }
  },
  
  setPatternOpacity: (opacity) => {
    const validOpacity = Math.max(0, Math.min(100, opacity));
    set(state => ({
      pageSettings: { ...state.pageSettings, patternOpacity: validOpacity }
    }));
  },
  
  // FIXED: Enhanced Canvas data actions with better state management
  setCanvasData: (data) => {
    const currentData = get().canvasData;
    
    // ADDED: Skip if same data to prevent unnecessary updates
    if (currentData === data) {
      console.log('DrawingStore: Skipping duplicate canvas data update');
      return;
    }
    
    console.log('DrawingStore: Setting canvas data', data ? `${data.substring(0, 100)}... (${data.length} chars)` : 'null');
    set({ 
      canvasData: data,
      hasUnsavedChanges: !!data && data !== '{"type":"drawing","version":1,"elements":[]}',
      isDataLoading: false
    });
  },
  
  // ADDED: Set data loading state
  setDataLoading: (loading) => {
    console.log('DrawingStore: Setting data loading state:', loading);
    set({ isDataLoading: loading });
  },
  
  markChangesSaved: () => {
    console.log('DrawingStore: Marking changes as saved');
    set({ hasUnsavedChanges: false });
  },
  
  // FIXED: Clear canvas data cleanly
  clearCanvasData: () => {
    console.log('DrawingStore: Clearing canvas data');
    set({ 
      canvasData: null,
      hasUnsavedChanges: false,
      isDataLoading: false
    });
  },
  
  // ADDED: Force refresh canvas data
  refreshCanvasData: () => {
    const { getCurrentCanvasData } = get();
    if (getCurrentCanvasData) {
      try {
        const freshData = getCurrentCanvasData();
        if (freshData && typeof freshData === 'string') {
          console.log('DrawingStore: Refreshing canvas data');
          set({ 
            canvasData: freshData,
            hasUnsavedChanges: true 
          });
          return freshData;
        }
      } catch (error) {
        console.error('DrawingStore: Error refreshing canvas data:', error);
      }
    }
    return null;
  },
  
  // Canvas method references
  clearCanvas: null,
  exportCanvasImage: null,
  undoCanvas: null,
  getCurrentCanvasData: null,
  loadCanvasData: null, // NEW: Direct canvas data loading
  
  // FIXED: Register canvas methods with validation and enhanced functionality
  registerCanvasMethods: (methods) => {
    console.log('DrawingStore: Registering canvas methods', Object.keys(methods));
    
    // Validate methods
    const requiredMethods = ['clearCanvas', 'exportImage', 'undo', 'getCurrentCanvasData'];
    const missingMethods = requiredMethods.filter(method => !methods[method]);
    
    if (missingMethods.length > 0) {
      console.warn('DrawingStore: Missing canvas methods:', missingMethods);
    }
    
    set({
      clearCanvas: methods.clearCanvas,
      exportCanvasImage: methods.exportImage,
      undoCanvas: methods.undo,
      getCurrentCanvasData: methods.getCurrentCanvasData,
      loadCanvasData: methods.loadCanvasData // NEW: Register load method
    });
  },
  
  // ADDED: Batch updates to prevent multiple re-renders
  batchUpdateCanvasState: (updates) => {
    console.log('DrawingStore: Batch updating canvas state');
    set(state => ({
      ...state,
      ...updates
    }));
  },
  
  // ADDED: Get current state snapshot
  getStateSnapshot: () => {
    const state = get();
    return {
      canvasData: state.canvasData,
      hasUnsavedChanges: state.hasUnsavedChanges,
      isDataLoading: state.isDataLoading,
      currentTool: state.currentTool,
      pageSettings: state.pageSettings
    };
  }
}));