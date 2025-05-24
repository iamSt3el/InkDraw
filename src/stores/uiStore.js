// src/stores/uiStore.js - Updated with Shape Panel Support
import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // Panel visibility
  isPenPanelVisible: false,
  isPagePanelVisible: false,
  isShapePanelVisible: false,  // Add shape panel visibility
  isMenuOpen: false,
  
  // Modal states
  isDeleteModalOpen: false,
  isExportModalOpen: false,
  isSettingsModalOpen: false,
  isDataDirectoryModalOpen: false,
  
  // Currently selected item for modals
  selectedItemId: null,
  
  // Notification state
  notification: null,
  
  // Loading and saving states
  isLoading: false,
  isSaving: false,
  error: null,
  
  // Actions for panel visibility
  togglePenPanel: () => set(state => ({ 
    isPenPanelVisible: !state.isPenPanelVisible,
    // Auto-hide shape panel when pen panel is shown
    isShapePanelVisible: !state.isPenPanelVisible ? false : state.isShapePanelVisible
  })),
  
  togglePagePanel: () => set(state => ({ isPagePanelVisible: !state.isPagePanelVisible })),
  
  toggleShapePanel: () => set(state => ({ 
    isShapePanelVisible: !state.isShapePanelVisible,
    // Auto-hide pen panel when shape panel is shown
    isPenPanelVisible: !state.isShapePanelVisible ? false : state.isPenPanelVisible
  })),
  
  toggleMenu: () => set(state => ({ isMenuOpen: !state.isMenuOpen })),
  
  // Set panel visibility directly
  setPenPanelVisible: (visible) => set({ 
    isPenPanelVisible: visible,
    // Auto-hide shape panel when pen panel is shown
    isShapePanelVisible: visible ? false : get().isShapePanelVisible
  }),
  
  setPagePanelVisible: (visible) => set({ isPagePanelVisible: visible }),
  
  setShapePanelVisible: (visible) => set({ 
    isShapePanelVisible: visible,
    // Auto-hide pen panel when shape panel is shown
    isPenPanelVisible: visible ? false : get().isPenPanelVisible
  }),
  
  setMenuOpen: (open) => set({ isMenuOpen: open }),
  
  // Open and close specific modals
  openDeleteModal: (itemId) => set({ isDeleteModalOpen: true, selectedItemId: itemId }),
  closeDeleteModal: () => set({ isDeleteModalOpen: false, selectedItemId: null }),
  
  openExportModal: () => set({ isExportModalOpen: true }),
  closeExportModal: () => set({ isExportModalOpen: false }),
  
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),
  
  openDataDirectoryModal: () => set({ isDataDirectoryModalOpen: true }),
  closeDataDirectoryModal: () => set({ isDataDirectoryModalOpen: false }),
  
  // Loading and error states
  setLoading: (isLoading) => {
    console.log('UIStore: Setting loading state:', isLoading);
    set({ isLoading });
  },
  
  setSaving: (isSaving) => {
    console.log('UIStore: Setting saving state:', isSaving);
    set({ isSaving });
  },
  
  setError: (error) => {
    console.log('UIStore: Setting error:', error);
    set({ error });
  },
  
  // Show notification with proper implementation
  showNotification: (type, message, duration = 5000) => {
    console.log(`UIStore: Showing ${type} notification:`, message);
    
    const notification = { 
      type, 
      message, 
      duration,
      id: Date.now()
    };
    
    set({ notification });
    
    setTimeout(() => {
      set(state => {
        if (state.notification && state.notification.id === notification.id) {
          return { notification: null };
        }
        return {};
      });
    }, duration);
  },
  
  // Clear notification
  clearNotification: () => {
    console.log('UIStore: Clearing notification');
    set({ notification: null });
  },
  
  // Show/hide specific panel with smart switching
  showPanel: (panelName) => {
    console.log('UIStore: Showing panel:', panelName);
    switch (panelName) {
      case 'pen':
        set({ 
          isPenPanelVisible: true, 
          isShapePanelVisible: false 
        });
        break;
      case 'shape':
        set({ 
          isShapePanelVisible: true, 
          isPenPanelVisible: false 
        });
        break;
      case 'page':
        set({ isPagePanelVisible: true });
        break;
      default:
        console.warn('UIStore: Unknown panel name:', panelName);
        break;
    }
  },

  // Hide all drawing panels
  hideDrawingPanels: () => {
    console.log('UIStore: Hiding all drawing panels');
    set({
      isPenPanelVisible: false,
      isShapePanelVisible: false
    });
  },

  // Smart panel switching based on tool
  switchPanelForTool: (tool) => {
    console.log('UIStore: Switching panel for tool:', tool);
    switch (tool) {
      case 'pen':
        set({ 
          isPenPanelVisible: true, 
          isShapePanelVisible: false 
        });
        break;
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'line':
        set({ 
          isShapePanelVisible: true, 
          isPenPanelVisible: false 
        });
        break;
      case 'eraser':
      case 'pan':
        // Don't auto-show panels for these tools
        break;
      default:
        break;
    }
  },

  // Export functions for toolbar
  handleExportImage: async () => {
    console.log('UIStore: Handling image export');
    try {
      const { exportCanvasImage } = require('./drawingStore').useDrawingStore.getState();
      
      if (exportCanvasImage) {
        const dataUrl = await exportCanvasImage('png');
        if (dataUrl) {
          const link = document.createElement('a');
          link.download = `drawing-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
          
          get().showNotification('success', 'Image exported successfully');
        } else {
          throw new Error('Failed to generate image');
        }
      } else {
        throw new Error('Export function not available');
      }
    } catch (error) {
      console.error('Export image error:', error);
      get().showNotification('error', 'Failed to export image: ' + error.message);
    }
  },

  handleExportSVG: async () => {
    console.log('UIStore: Handling SVG export');
    try {
      get().showNotification('info', 'SVG export feature coming soon');
    } catch (error) {
      console.error('Export SVG error:', error);
      get().showNotification('error', 'Failed to export SVG: ' + error.message);
    }
  },
  
  // Close all panels and modals
  closeAll: () => set({
    isPenPanelVisible: false,
    isPagePanelVisible: false,
    isShapePanelVisible: false,
    isMenuOpen: false,
    isDeleteModalOpen: false,
    isExportModalOpen: false,
    isSettingsModalOpen: false,
    isDataDirectoryModalOpen: false,
    selectedItemId: null
  }),
  
  // Reset to default state
  resetUI: () => set({
    isPenPanelVisible: false,
    isPagePanelVisible: false,
    isShapePanelVisible: false,
    isMenuOpen: false,
    isDeleteModalOpen: false,
    isExportModalOpen: false,
    isSettingsModalOpen: false,
    isDataDirectoryModalOpen: false,
    selectedItemId: null,
    notification: null,
    isLoading: false,
    isSaving: false,
    error: null
  })
}));