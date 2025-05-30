// src/stores/uiStore.js - UPDATED with AI Text Panel Support
import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // Panel visibility - ADDED isAiTextPanelVisible
  isPenPanelVisible: false,
  isPagePanelVisible: false,
  isShapePanelVisible: false,
  isAiTextPanelVisible: false, // NEW: AI Text Panel visibility
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
    // Auto-hide other drawing panels when pen panel is shown
    isShapePanelVisible: !state.isPenPanelVisible ? false : state.isShapePanelVisible,
    isAiTextPanelVisible: !state.isPenPanelVisible ? false : state.isAiTextPanelVisible
  })),
  
  togglePagePanel: () => set(state => ({ isPagePanelVisible: !state.isPagePanelVisible })),
  
  toggleShapePanel: () => set(state => ({ 
    isShapePanelVisible: !state.isShapePanelVisible,
    // Auto-hide other drawing panels when shape panel is shown
    isPenPanelVisible: !state.isShapePanelVisible ? false : state.isPenPanelVisible,
    isAiTextPanelVisible: !state.isShapePanelVisible ? false : state.isAiTextPanelVisible
  })),
  
  // NEW: Toggle AI Text Panel
  toggleAiTextPanel: () => set(state => ({
    isAiTextPanelVisible: !state.isAiTextPanelVisible,
    // Auto-hide other drawing panels when AI text panel is shown
    isPenPanelVisible: !state.isAiTextPanelVisible ? false : state.isPenPanelVisible,
    isShapePanelVisible: !state.isAiTextPanelVisible ? false : state.isShapePanelVisible
  })),
  
  toggleMenu: () => set(state => ({ isMenuOpen: !state.isMenuOpen })),
  
  // Set panel visibility directly
  setPenPanelVisible: (visible) => set({ 
    isPenPanelVisible: visible,
    // Auto-hide other drawing panels when pen panel is shown
    isShapePanelVisible: visible ? false : get().isShapePanelVisible,
    isAiTextPanelVisible: visible ? false : get().isAiTextPanelVisible
  }),
  
  setPagePanelVisible: (visible) => set({ isPagePanelVisible: visible }),
  
  setShapePanelVisible: (visible) => set({ 
    isShapePanelVisible: visible,
    // Auto-hide other drawing panels when shape panel is shown
    isPenPanelVisible: visible ? false : get().isPenPanelVisible,
    isAiTextPanelVisible: visible ? false : get().isAiTextPanelVisible
  }),
  
  // NEW: Set AI Text Panel visibility
  setAiTextPanelVisible: (visible) => set({
    isAiTextPanelVisible: visible,
    // Auto-hide other drawing panels when AI text panel is shown
    isPenPanelVisible: visible ? false : get().isPenPanelVisible,
    isShapePanelVisible: visible ? false : get().isShapePanelVisible
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
          isShapePanelVisible: false,
          isAiTextPanelVisible: false
        });
        break;
      case 'shape':
        set({ 
          isShapePanelVisible: true, 
          isPenPanelVisible: false,
          isAiTextPanelVisible: false
        });
        break;
      case 'aiText': // NEW: AI Text panel case
        set({
          isAiTextPanelVisible: true,
          isPenPanelVisible: false,
          isShapePanelVisible: false
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
      isShapePanelVisible: false,
      isAiTextPanelVisible: false // ADDED: Hide AI text panel
    });
  },

  // UPDATED: Smart panel switching based on tool with AI support
  switchPanelForTool: (tool) => {
    console.log('UIStore: Switching panel for tool:', tool);
    switch (tool) {
      case 'pen':
        set({ 
          isPenPanelVisible: true, 
          isShapePanelVisible: false,
          isAiTextPanelVisible: false
        });
        break;
      case 'aiHandwriting': // NEW: Auto-show AI text panel for AI tool
        set({
          isAiTextPanelVisible: true,
          isPenPanelVisible: false,
          isShapePanelVisible: false
        });
        break;
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'line':
        set({ 
          isShapePanelVisible: true, 
          isPenPanelVisible: false,
          isAiTextPanelVisible: false
        });
        break;
      case 'eraser':
      case 'pan':
      case 'select':
        // Don't auto-show panels for these tools, but hide drawing panels
        set({
          isPenPanelVisible: false,
          isShapePanelVisible: false,
          isAiTextPanelVisible: false
        });
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
  
  // Close all panels and modals - UPDATED with AI text panel
  closeAll: () => set({
    isPenPanelVisible: false,
    isPagePanelVisible: false,
    isShapePanelVisible: false,
    isAiTextPanelVisible: false, // ADDED: Close AI text panel
    isMenuOpen: false,
    isDeleteModalOpen: false,
    isExportModalOpen: false,
    isSettingsModalOpen: false,
    isDataDirectoryModalOpen: false,
    selectedItemId: null
  }),
  
  // Reset to default state - UPDATED with AI text panel
  resetUI: () => set({
    isPenPanelVisible: false,
    isPagePanelVisible: false,
    isShapePanelVisible: false,
    isAiTextPanelVisible: false, // ADDED: Reset AI text panel
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