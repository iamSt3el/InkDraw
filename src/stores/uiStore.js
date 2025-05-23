// src/stores/uiStore.js - FIXED VERSION (added missing showNotification)
import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // Panel visibility
  isPenPanelVisible: true,
  isPagePanelVisible: true,
  isShapePanelVisible: false,
  isMenuOpen: false,
  
  // Modal states
  isDeleteModalOpen: false,
  isExportModalOpen: false,
  isSettingsModalOpen: false,
  isDataDirectoryModalOpen: false,
  
  // Currently selected item for modals
  selectedItemId: null,
  
  // Notification state
  notification: null, // { type: 'success' | 'error' | 'info' | 'warning', message: string, duration: number }
  
  // Loading and saving states
  isLoading: false,
  isSaving: false,
  error: null,
  
  // Actions for panel visibility
  togglePenPanel: () => set(state => ({ isPenPanelVisible: !state.isPenPanelVisible })),
  togglePagePanel: () => set(state => ({ isPagePanelVisible: !state.isPagePanelVisible })),
  toggleShapePanel: () => set(state => ({ isShapePanelVisible: !state.isShapePanelVisible })),
  toggleMenu: () => set(state => ({ isMenuOpen: !state.isMenuOpen })),
  
  // Set panel visibility directly
  setPenPanelVisible: (visible) => set({ isPenPanelVisible: visible }),
  setPagePanelVisible: (visible) => set({ isPagePanelVisible: visible }),
  setShapePanelVisible: (visible) => set({ isShapePanelVisible: visible }),
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
  
  // FIXED: Show notification with proper implementation
  showNotification: (type, message, duration = 5000) => {
    console.log(`UIStore: Showing ${type} notification:`, message);
    
    const notification = { 
      type, 
      message, 
      duration,
      id: Date.now() // Add unique ID for tracking
    };
    
    set({ notification });
    
    // Auto-hide after duration
    setTimeout(() => {
      set(state => {
        // Only clear if it's the same notification (prevent race conditions)
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
  
  // Show/hide specific panel
  showPanel: (panelName) => {
    console.log('UIStore: Showing panel:', panelName);
    switch (panelName) {
      case 'pen':
        set({ isPenPanelVisible: true, isShapePanelVisible: false });
        break;
      case 'shape':
        set({ isShapePanelVisible: true, isPenPanelVisible: false });
        break;
      case 'page':
        set({ isPagePanelVisible: true });
        break;
      default:
        console.warn('UIStore: Unknown panel name:', panelName);
        break;
    }
  },

  // ADDED: Export functions for toolbar
  handleExportImage: async () => {
    console.log('UIStore: Handling image export');
    try {
      // Get export function from drawing store
      const { exportCanvasImage } = require('./drawingStore').useDrawingStore.getState();
      
      if (exportCanvasImage) {
        const dataUrl = await exportCanvasImage('png');
        if (dataUrl) {
          // Create download
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
      // This would need to be implemented in the canvas engine
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
    isPenPanelVisible: true,
    isPagePanelVisible: true,
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