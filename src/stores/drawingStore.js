// src/stores/drawingStore.js
import { create } from 'zustand';

export const useDrawingStore = create((set, get) => ({
  // Tool state
  currentTool: 'pen',
  strokeColor: '#000000',
  strokeWidth: 5,
  opacity: 100,
  eraserWidth: 10,
  
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
  setTool: (tool) => set({ currentTool: tool }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setOpacity: (opacity) => set({ opacity }),
  setEraserWidth: (width) => set({ eraserWidth: width }),
  
  setCanvasDimensions: (dimensions) => set({
    canvasDimensions: dimensions
  }),
  
  // Page settings actions
  setPattern: (pattern) => set(state => ({
    pageSettings: { ...state.pageSettings, pattern }
  })),
  
  setPatternSize: (size) => set(state => ({
    pageSettings: { ...state.pageSettings, patternSize: size }
  })),
  
  setPatternColor: (color) => set(state => ({
    pageSettings: { ...state.pageSettings, patternColor: color }
  })),
  
  setPatternOpacity: (opacity) => set(state => ({
    pageSettings: { ...state.pageSettings, patternOpacity: opacity }
  })),
  
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