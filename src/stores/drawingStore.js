// src/stores/drawingStore.js - COMPLETE FIXED VERSION
import { create } from 'zustand';

const VALID_PATTERNS = ['blank', 'grid', 'dots', 'lines', 'graph'];

export const useDrawingStore = create((set, get) => ({
  // Tool state
  currentTool: 'pen',
  strokeColor: '#000000',
  strokeWidth: 5,
  opacity: 100,
  eraserWidth: 10,

   // AI Handwriting specific settings - NEW
   aiTextSettings: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: 22,
    fontWeight: 'normal',
    textColor: null, // null means use stroke color
    textAlign: 'center'
  },
  
  // AI processing state - NEW
  isAiProcessing: false,
  aiProcessingTimer: null,
  currentAiStrokes: [], // Raw coordinate data for current word
  aiWordBoundaryThreshold: 40, // pixels
  
  // Selection state
  selectedItems: new Set(), // Set of selected item IDs
  selectionBounds: null, // { x, y, width, height } of selection
  isSelecting: false, // True when dragging selection area
  selectionStart: null, // Start point for area selection
  selectionRect: null, // Current selection rectangle
  
  // Shape properties
  shapeColor: '#000000',
  shapeBorderSize: 2,
  shapeFill: false,
  shapeFillColor: '#000000',
  shapeRoundCorners: false,
  
  // Canvas dimensions
  canvasDimensions: {
    width: 1600,
    height: 870
  },
  
  // Zoom and Pan state
  zoomLevel: 1,
  viewBox: { x: 0, y: 0, width: 1600, height: 870 },
  
  // Page settings
  pageSettings: {
    pattern: 'grid',
    patternSize: 20,
    patternColor: '#e5e7eb',
    patternOpacity: 50
  },
  
  // Canvas state management
  canvasData: null,
  hasUnsavedChanges: false,
  isDataLoading: false,
  
   // UPDATED: Tool actions with AI handwriting support
   setTool: (tool) => {
    const validTools = ['pen', 'eraser', 'pan', 'rectangle', 'select', 'aiHandwriting']; // ADDED aiHandwriting
    if (validTools.includes(tool)) {
      // Clear selection when switching away from select tool
      if (get().currentTool === 'select' && tool !== 'select') {
        get().clearSelection();
      }
      
      // NEW: Clear AI processing when switching away from AI tool
      if (get().currentTool === 'aiHandwriting' && tool !== 'aiHandwriting') {
        get().clearAiProcessing();
      }
      
      set({ currentTool: tool });
    } else {
      console.warn(`Invalid tool: ${tool}`);
    }
  },

  // NEW: AI Text Settings Actions
  setAiFontFamily: (fontFamily) => {
    set(state => ({
      aiTextSettings: { ...state.aiTextSettings, fontFamily }
    }));
  },
  
  setAiFontSize: (fontSize) => {
    const validSize = Math.max(8, Math.min(72, fontSize));
    set(state => ({
      aiTextSettings: { ...state.aiTextSettings, fontSize: validSize }
    }));
  },
  
  setAiFontWeight: (fontWeight) => {
    const validWeights = ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
    if (validWeights.includes(fontWeight)) {
      set(state => ({
        aiTextSettings: { ...state.aiTextSettings, fontWeight }
      }));
    }
  },
  
  setAiTextColor: (textColor) => {
    set(state => ({
      aiTextSettings: { ...state.aiTextSettings, textColor }
    }));
  },
  
  setAiTextAlign: (textAlign) => {
    const validAlignments = ['left', 'center', 'right'];
    if (validAlignments.includes(textAlign)) {
      set(state => ({
        aiTextSettings: { ...state.aiTextSettings, textAlign }
      }));
    }
  },
  
  // NEW: AI Processing Actions
  setAiProcessing: (isProcessing) => {
    set({ isAiProcessing: isProcessing });
  },
  
  addAiStroke: (strokeCoordinates) => {
    set(state => ({
      currentAiStrokes: [...state.currentAiStrokes, strokeCoordinates]
    }));
  },
  
  clearAiProcessing: () => {
    const state = get();
    if (state.aiProcessingTimer) {
      clearTimeout(state.aiProcessingTimer);
    }
    set({
      isAiProcessing: false,
      aiProcessingTimer: null,
      currentAiStrokes: []
    });
  },
  
  startAiProcessingTimer: (callback) => {
    const state = get();
    
    // Clear existing timer
    if (state.aiProcessingTimer) {
      clearTimeout(state.aiProcessingTimer);
    }
    
    // Start new 1-second timer
    const timer = setTimeout(() => {
      if (state.currentAiStrokes.length > 0) {
        callback(state.currentAiStrokes);
      }
    }, 1000);
    
    set({ aiProcessingTimer: timer });
  },
  
  // NEW: Word boundary detection
  shouldStartNewWord: (newStrokeStart) => {
    const state = get();
    if (state.currentAiStrokes.length === 0) return false;
    
    // Get last point of last stroke
    const lastStroke = state.currentAiStrokes[state.currentAiStrokes.length - 1];
    if (!lastStroke || lastStroke.length === 0) return false;
    
    const lastPoint = lastStroke[lastStroke.length - 1];
    const distance = Math.sqrt(
      Math.pow(newStrokeStart.x - lastPoint.x, 2) + 
      Math.pow(newStrokeStart.y - lastPoint.y, 2)
    );
    
    return distance > state.aiWordBoundaryThreshold;
  },
  
  // FIXED: Selection actions with proper method connections
  addToSelection: (itemId) => {
    set(state => {
      const newSelected = new Set(state.selectedItems);
      newSelected.add(itemId);
      const newBounds = get().calculateSelectionBounds(newSelected);
      return { 
        selectedItems: newSelected,
        selectionBounds: newBounds
      };
    });
  },
  
  removeFromSelection: (itemId) => {
    set(state => {
      const newSelected = new Set(state.selectedItems);
      newSelected.delete(itemId);
      const newBounds = newSelected.size > 0 ? get().calculateSelectionBounds(newSelected) : null;
      return { 
        selectedItems: newSelected,
        selectionBounds: newBounds
      };
    });
  },
  
  setSelection: (itemIds) => {
    const selectedSet = new Set(Array.isArray(itemIds) ? itemIds : [itemIds]);
    const newBounds = selectedSet.size > 0 ? get().calculateSelectionBounds(selectedSet) : null;
    set({ 
      selectedItems: selectedSet,
      selectionBounds: newBounds
    });
  },
  
  clearSelection: () => {
    set({ 
      selectedItems: new Set(),
      selectionBounds: null,
      isSelecting: false,
      selectionStart: null,
      selectionRect: null
    });
  },
  
  toggleSelection: (itemId) => {
    const state = get();
    if (state.selectedItems.has(itemId)) {
      state.removeFromSelection(itemId);
    } else {
      state.addToSelection(itemId);
    }
  },
  
  // Selection area methods
  startAreaSelection: (point) => {
    set({
      isSelecting: true,
      selectionStart: point,
      selectionRect: { x: point.x, y: point.y, width: 0, height: 0 }
    });
  },
  
  updateAreaSelection: (currentPoint) => {
    const state = get();
    if (!state.isSelecting || !state.selectionStart) return;
    
    const start = state.selectionStart;
    const rect = {
      x: Math.min(start.x, currentPoint.x),
      y: Math.min(start.y, currentPoint.y),
      width: Math.abs(currentPoint.x - start.x),
      height: Math.abs(currentPoint.y - start.y)
    };
    
    set({ selectionRect: rect });
  },
  
  // FIXED: finishAreaSelection with connected methods
  finishAreaSelection: () => {
    const state = get();
    if (!state.isSelecting || !state.selectionRect) return;
    
    console.log('DrawingStore: Finishing area selection with rect:', state.selectionRect);
    
    // Use the connected findItemsInRect method
    if (state.findItemsInRect) {
      const itemsInRect = state.findItemsInRect(state.selectionRect);
      console.log('DrawingStore: Found items in selection rect:', itemsInRect);
      state.setSelection(itemsInRect);
    } else {
      console.warn('DrawingStore: findItemsInRect method not available');
    }
    
    set({
      isSelecting: false,
      selectionStart: null,
      selectionRect: null
    });
  },
  
  // FIXED: Selection bounds calculation with connected methods
  calculateSelectionBounds: (selectedItems) => {
    const state = get();
    console.log('DrawingStore: Calculating selection bounds for:', selectedItems);
    
    if (state.getSelectionBounds) {
      const bounds = state.getSelectionBounds(selectedItems);
      console.log('DrawingStore: Calculated bounds:', bounds);
      return bounds;
    } else {
      console.warn('DrawingStore: getSelectionBounds method not available');
      return null;
    }
  },
  
  // FIXED: Transform selected items with connected methods
  moveSelection: (deltaX, deltaY) => {
    const state = get();
    if (state.selectedItems.size === 0) return;
    
    console.log('DrawingStore: Moving selection:', deltaX, deltaY);
    
    if (state.moveSelectedItems) {
      state.moveSelectedItems(deltaX, deltaY);
      // Update selection bounds
      if (state.getSelectionBounds) {
        const newBounds = state.getSelectionBounds(state.selectedItems);
        set({ selectionBounds: newBounds });
      }
    } else {
      console.warn('DrawingStore: moveSelectedItems method not available');
    }
  },
  
  resizeSelection: (newBounds) => {
    const state = get();
    if (state.selectedItems.size === 0) return;
    
    console.log('DrawingStore: Resizing selection:', newBounds);
    
    if (state.resizeSelectedItems) {
      state.resizeSelectedItems(newBounds);
      set({ selectionBounds: newBounds });
    } else {
      console.warn('DrawingStore: resizeSelectedItems method not available');
    }
  },
  
  deleteSelection: () => {
    const state = get();
    if (state.selectedItems.size === 0) return;
    
    console.log('DrawingStore: Deleting selection');
    
    if (state.deleteSelectedItems) {
      state.deleteSelectedItems();
      state.clearSelection();
    } else {
      console.warn('DrawingStore: deleteSelectedItems method not available');
    }
  },
  
  // Existing stroke/shape actions...
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
  
  // Shape actions
  setShapeColor: (color) => {
    if (typeof color === 'string' && (color.startsWith('#') || color.startsWith('rgb'))) {
      set({ shapeColor: color });
    } else {
      console.warn(`Invalid shape color: ${color}`);
    }
  },
  
  setShapeBorderSize: (size) => {
    const validSize = Math.max(1, Math.min(20, size));
    set({ shapeBorderSize: validSize });
  },
  
  setShapeFill: (fill) => {
    set({ shapeFill: !!fill });
  },
  
  setShapeFillColor: (color) => {
    if (typeof color === 'string' && (color.startsWith('#') || color.startsWith('rgb'))) {
      set({ shapeFillColor: color });
    } else {
      console.warn(`Invalid shape fill color: ${color}`);
    }
  },
  
  setShapeRoundCorners: (round) => {
    set({ shapeRoundCorners: !!round });
  },
  
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
  
  // Canvas data actions
  setCanvasData: (data) => {
    const currentData = get().canvasData;
    
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
  
  setDataLoading: (loading) => {
    console.log('DrawingStore: Setting data loading state:', loading);
    set({ isDataLoading: loading });
  },
  
  markChangesSaved: () => {
    console.log('DrawingStore: Marking changes as saved');
    set({ hasUnsavedChanges: false });
  },
  
  clearCanvasData: () => {
    console.log('DrawingStore: Clearing canvas data');
    set({ 
      canvasData: null,
      hasUnsavedChanges: false,
      isDataLoading: false
    });
    // Also clear selection when clearing canvas
    get().clearSelection();
  },
  
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
  
  // Canvas method references (FIXED: Remove null assignments, let registerCanvasMethods set them)
  clearCanvas: null,
  exportCanvasImage: null,
  undoCanvas: null,
  getCurrentCanvasData: null,
  loadCanvasData: null,
  addImage: null, // Image handling method
  
  // FIXED: Selection method references (these will be set by registerCanvasMethods)
  findItemsInRect: null,
  getSelectionBounds: null,
  moveSelectedItems: null,
  resizeSelectedItems: null,
  deleteSelectedItems: null,
  
  // FIXED: Register canvas methods with ALL selection methods
  registerCanvasMethods: (methods) => {
    console.log('DrawingStore: Registering canvas methods', Object.keys(methods));
    
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
      loadCanvasData: methods.loadCanvasData,
      addImage: methods.addImage, // Add image method
      // FIXED: Add all selection methods
      findItemsInRect: methods.findItemsInRect,
      getSelectionBounds: methods.getSelectionBounds,
      moveSelectedItems: methods.moveSelectedItems,
      resizeSelectedItems: methods.resizeSelectedItems,
      deleteSelectedItems: methods.deleteSelectedItems
    });
    
    console.log('DrawingStore: All methods registered successfully');
  },
  
  batchUpdateCanvasState: (updates) => {
    console.log('DrawingStore: Batch updating canvas state');
    set(state => ({
      ...state,
      ...updates
    }));
  },
  
  getStateSnapshot: () => {
    const state = get();
    return {
      canvasData: state.canvasData,
      hasUnsavedChanges: state.hasUnsavedChanges,
      isDataLoading: state.isDataLoading,
      currentTool: state.currentTool,
      pageSettings: state.pageSettings,
      selectedItems: state.selectedItems,
      selectionBounds: state.selectionBounds,
      shapeColor: state.shapeColor,
      shapeBorderSize: state.shapeBorderSize,
      shapeFill: state.shapeFill,
      shapeFillColor: state.shapeFillColor,
      shapeRoundCorners: state.shapeRoundCorners
    };
  },

  // Helper method for getting current shape options
  getShapeOptions: () => {
    const state = get();
    return {
      color: state.shapeColor,
      borderSize: state.shapeBorderSize,
      fill: state.shapeFill,
      fillColor: state.shapeFillColor,
      roundCorners: state.shapeRoundCorners
    };
  }
}));

// FIXED: Add global debug function
if (typeof window !== 'undefined') {
  window.debugSelection = () => {
    console.log('=== SELECTION DEBUG ===');
    
    const drawingState = useDrawingStore.getState();
    console.log('Drawing store selection methods:', {
      findItemsInRect: !!drawingState.findItemsInRect,
      getSelectionBounds: !!drawingState.getSelectionBounds,
      moveSelectedItems: !!drawingState.moveSelectedItems,
      resizeSelectedItems: !!drawingState.resizeSelectedItems,
      deleteSelectedItems: !!drawingState.deleteSelectedItems
    });
    
    console.log('Current selection state:', {
      selectedItems: Array.from(drawingState.selectedItems),
      selectionBounds: drawingState.selectionBounds,
      currentTool: drawingState.currentTool
    });
    
    console.log('=== END DEBUG ===');
  };
}