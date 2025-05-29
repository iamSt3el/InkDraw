// src/stores/drawingStore.js - Updated with Selection Support
import { create } from 'zustand';

const VALID_PATTERNS = ['blank', 'grid', 'dots', 'lines', 'graph'];

export const useDrawingStore = create((set, get) => ({
  // Tool state
  currentTool: 'pen',
  strokeColor: '#000000',
  strokeWidth: 5,
  opacity: 100,
  eraserWidth: 10,
  
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
  
  // Canvas state management
  canvasData: null,
  hasUnsavedChanges: false,
  isDataLoading: false,
  
  // Tool actions
  setTool: (tool) => {
    const validTools = ['pen', 'eraser', 'pointer', 'pan', 'rectangle', 'select'];
    if (validTools.includes(tool)) {
      // Clear selection when switching away from select tool
      if (get().currentTool === 'select' && tool !== 'select') {
        get().clearSelection();
      }
      set({ currentTool: tool });
    } else {
      console.warn(`Invalid tool: ${tool}`);
    }
  },
  
  // Selection actions
  addToSelection: (itemId) => {
    set(state => {
      const newSelected = new Set(state.selectedItems);
      newSelected.add(itemId);
      return { 
        selectedItems: newSelected,
        selectionBounds: get().calculateSelectionBounds(newSelected)
      };
    });
  },
  
  removeFromSelection: (itemId) => {
    set(state => {
      const newSelected = new Set(state.selectedItems);
      newSelected.delete(itemId);
      return { 
        selectedItems: newSelected,
        selectionBounds: newSelected.size > 0 ? get().calculateSelectionBounds(newSelected) : null
      };
    });
  },
  
  setSelection: (itemIds) => {
    const selectedSet = new Set(Array.isArray(itemIds) ? itemIds : [itemIds]);
    set({ 
      selectedItems: selectedSet,
      selectionBounds: selectedSet.size > 0 ? get().calculateSelectionBounds(selectedSet) : null
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
  
  finishAreaSelection: () => {
    const state = get();
    if (!state.isSelecting || !state.selectionRect) return;
    
    // This will be implemented in CanvasEngine to find items in selection rect
    if (state.findItemsInRect) {
      const itemsInRect = state.findItemsInRect(state.selectionRect);
      state.setSelection(itemsInRect);
    }
    
    set({
      isSelecting: false,
      selectionStart: null,
      selectionRect: null
    });
  },
  
  // Selection bounds calculation (will be implemented by canvas engine)
  calculateSelectionBounds: (selectedItems) => {
    const state = get();
    if (state.getSelectionBounds) {
      return state.getSelectionBounds(selectedItems);
    }
    return null;
  },
  
  // Transform selected items
  moveSelection: (deltaX, deltaY) => {
    const state = get();
    if (state.selectedItems.size === 0) return;
    
    if (state.moveSelectedItems) {
      state.moveSelectedItems(deltaX, deltaY);
      // Update selection bounds
      const newBounds = state.calculateSelectionBounds(state.selectedItems);
      set({ selectionBounds: newBounds });
    }
  },
  
  resizeSelection: (newBounds) => {
    const state = get();
    if (state.selectedItems.size === 0) return;
    
    if (state.resizeSelectedItems) {
      state.resizeSelectedItems(newBounds);
      set({ selectionBounds: newBounds });
    }
  },
  
  deleteSelection: () => {
    const state = get();
    if (state.selectedItems.size === 0) return;
    
    if (state.deleteSelectedItems) {
      state.deleteSelectedItems();
      state.clearSelection();
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
  
  // Zoom and Pan actions (existing code)...
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
  
  // Page settings actions (existing code)...
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
  
  // Canvas data actions (existing code)...
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
  
  // Canvas method references
  clearCanvas: null,
  exportCanvasImage: null,
  undoCanvas: null,
  getCurrentCanvasData: null,
  loadCanvasData: null,
  
  // Selection method references (to be set by CanvasEngine)
  findItemsInRect: null,
  getSelectionBounds: null,
  moveSelectedItems: null,
  resizeSelectedItems: null,
  deleteSelectedItems: null,
  
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
      // Selection methods
      findItemsInRect: methods.findItemsInRect,
      getSelectionBounds: methods.getSelectionBounds,
      moveSelectedItems: methods.moveSelectedItems,
      resizeSelectedItems: methods.resizeSelectedItems,
      deleteSelectedItems: methods.deleteSelectedItems
    });
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