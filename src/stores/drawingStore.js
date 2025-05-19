// src/stores/drawingStore.js
import { create } from 'zustand';

export const useDrawingStore = create((set, get) => ({
  // Tool state
  currentTool: 'pen',
  strokeColor: '#000000',
  strokeWidth: 5,
  opacity: 100,
  eraserWidth: 10,
  sketchyMode: false,
  
  // Shape properties
  shapeProperties: {
    fill: false,
    fillColor: '#000000',
    fillOpacity: 20,
  },
  
  // Temporary shape during drawing
  temporaryShape: null,
  
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
  
  // Computed color with opacity
  get finalStrokeColor() {
    const { strokeColor, opacity } = get();
    
    if (opacity < 100) {
      const hex = strokeColor.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
    }
    
    return strokeColor;
  },
  
  // Actions for tool selection
  setTool: (tool) => set({ currentTool: tool }),
  
  // Actions for stroke settings
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setOpacity: (opacity) => set({ opacity }),
  setEraserWidth: (width) => set({ eraserWidth: width }),
  setSketchyMode: (enabled) => set({ sketchyMode: enabled }),
  
  // Actions for shape properties
  setShapeProperties: (properties) => set(state => ({
    shapeProperties: { ...state.shapeProperties, ...properties }
  })),
  
  setFill: (fill) => set(state => ({
    shapeProperties: { ...state.shapeProperties, fill }
  })),
  
  setFillColor: (color) => set(state => ({
    shapeProperties: { ...state.shapeProperties, fillColor: color }
  })),
  
  setFillOpacity: (opacity) => set(state => ({
    shapeProperties: { ...state.shapeProperties, fillOpacity: opacity }
  })),
  
  // Actions for temporary shape
  setTemporaryShape: (shape) => set({ temporaryShape: shape }),
  
  // Actions for page settings
  setPageSettings: (settings) => set(state => ({
    pageSettings: { ...state.pageSettings, ...settings }
  })),
  
  // Single setting updates for page settings
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
  
  // Initialize settings from loaded page
  initializeFromPage: (page) => {
    if (!page) return;
    
    const settings = page.settings || {};
    
    set({
      pageSettings: {
        pattern: settings.pattern || 'grid',
        patternSize: settings.patternSize || 20,
        patternColor: settings.patternColor || '#e5e7eb',
        patternOpacity: settings.patternOpacity || 50
      },
      sketchyMode: settings.sketchyMode || false,
      canvasData: page.canvasData || null,
      hasUnsavedChanges: false
    });
  },
  
  // Reset to defaults
  resetToolSettings: () => set({
    strokeColor: '#000000',
    strokeWidth: 5,
    opacity: 100,
    eraserWidth: 10,
    sketchyMode: false,
    shapeProperties: {
      fill: false,
      fillColor: '#000000',
      fillOpacity: 20,
    }
  }),
  
  // Reset everything (when changing pages)
  resetAll: () => set({
    currentTool: 'pen',
    strokeColor: '#000000',
    strokeWidth: 5,
    opacity: 100,
    eraserWidth: 10,
    sketchyMode: false,
    shapeProperties: {
      fill: false,
      fillColor: '#000000',
      fillOpacity: 20,
    },
    temporaryShape: null,
    pageSettings: {
      pattern: 'grid',
      patternSize: 20,
      patternColor: '#e5e7eb',
      patternOpacity: 50
    },
    canvasData: null,
    hasUnsavedChanges: false
  })
}));1