// src/stores/drawingStore.js
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
  
  // Canvas dimensions
  canvasDimensions: {
    width: 870,
    height: 870
  },
  
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
  
  // Actions
  setTool: (tool) => {
    const validTools = ['pen', 'eraser', 'pointer'];
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
  
  // Canvas data actions
  setCanvasData: (data) => set({ 
    canvasData: data,
    hasUnsavedChanges: true 
  }),
  
  markChangesSaved: () => set({ hasUnsavedChanges: false }),
  
  // Method to request canvas actions (for components that don't have direct ref access)
  clearCanvas: null, // Will be set by SmoothCanvas
  exportCanvasImage: null, // Will be set by SmoothCanvas
  undoCanvas: null, // Will be set by SmoothCanvas
  
  // Register canvas methods (called by SmoothCanvas during initialization)
  registerCanvasMethods: (methods) => set({
    clearCanvas: methods.clearCanvas,
    exportCanvasImage: methods.exportImage,
    undoCanvas: methods.undo
  })
}));