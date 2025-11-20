
import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  
  isPenPanelVisible: false,
  isPagePanelVisible: false,
  isShapePanelVisible: false,
  isAiTextPanelVisible: false, 
  isMenuOpen: false,
  
  
  isDeleteModalOpen: false,
  isExportModalOpen: false,
  isSettingsModalOpen: false,
  isDataDirectoryModalOpen: false,
  
  
  selectedItemId: null,
  
  
  notification: null,
  
  
  isLoading: false,
  isSaving: false,
  error: null,
  
  
  togglePenPanel: () => set(state => ({ 
    isPenPanelVisible: !state.isPenPanelVisible,
    
    isShapePanelVisible: !state.isPenPanelVisible ? false : state.isShapePanelVisible,
    isAiTextPanelVisible: !state.isPenPanelVisible ? false : state.isAiTextPanelVisible
  })),
  
  togglePagePanel: () => set(state => ({ isPagePanelVisible: !state.isPagePanelVisible })),
  
  toggleShapePanel: () => set(state => ({ 
    isShapePanelVisible: !state.isShapePanelVisible,
    
    isPenPanelVisible: !state.isShapePanelVisible ? false : state.isPenPanelVisible,
    isAiTextPanelVisible: !state.isShapePanelVisible ? false : state.isAiTextPanelVisible
  })),
  
  
  toggleAiTextPanel: () => set(state => ({
    isAiTextPanelVisible: !state.isAiTextPanelVisible,
    
    isPenPanelVisible: !state.isAiTextPanelVisible ? false : state.isPenPanelVisible,
    isShapePanelVisible: !state.isAiTextPanelVisible ? false : state.isShapePanelVisible
  })),
  
  toggleMenu: () => set(state => ({ isMenuOpen: !state.isMenuOpen })),
  
  
  setPenPanelVisible: (visible) => set({ 
    isPenPanelVisible: visible,
    
    isShapePanelVisible: visible ? false : get().isShapePanelVisible,
    isAiTextPanelVisible: visible ? false : get().isAiTextPanelVisible
  }),
  
  setPagePanelVisible: (visible) => set({ isPagePanelVisible: visible }),
  
  setShapePanelVisible: (visible) => set({ 
    isShapePanelVisible: visible,
    
    isPenPanelVisible: visible ? false : get().isPenPanelVisible,
    isAiTextPanelVisible: visible ? false : get().isAiTextPanelVisible
  }),
  
  
  setAiTextPanelVisible: (visible) => set({
    isAiTextPanelVisible: visible,
    
    isPenPanelVisible: visible ? false : get().isPenPanelVisible,
    isShapePanelVisible: visible ? false : get().isShapePanelVisible
  }),
  
  setMenuOpen: (open) => set({ isMenuOpen: open }),
  
  
  openDeleteModal: (itemId) => set({ isDeleteModalOpen: true, selectedItemId: itemId }),
  closeDeleteModal: () => set({ isDeleteModalOpen: false, selectedItemId: null }),
  
  openExportModal: () => set({ isExportModalOpen: true }),
  closeExportModal: () => set({ isExportModalOpen: false }),
  
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),
  
  openDataDirectoryModal: () => set({ isDataDirectoryModalOpen: true }),
  closeDataDirectoryModal: () => set({ isDataDirectoryModalOpen: false }),
  
  
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
  
  
  clearNotification: () => {
    console.log('UIStore: Clearing notification');
    set({ notification: null });
  },
  
  
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
      case 'aiText': 
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

  
  hideDrawingPanels: () => {
    console.log('UIStore: Hiding all drawing panels');
    set({
      isPenPanelVisible: false,
      isShapePanelVisible: false,
      isAiTextPanelVisible: false 
    });
  },

  
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
      case 'aiHandwriting': 
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
  
  
  closeAll: () => set({
    isPenPanelVisible: false,
    isPagePanelVisible: false,
    isShapePanelVisible: false,
    isAiTextPanelVisible: false, 
    isMenuOpen: false,
    isDeleteModalOpen: false,
    isExportModalOpen: false,
    isSettingsModalOpen: false,
    isDataDirectoryModalOpen: false,
    selectedItemId: null
  }),
  
  
  resetUI: () => set({
    isPenPanelVisible: false,
    isPagePanelVisible: false,
    isShapePanelVisible: false,
    isAiTextPanelVisible: false, 
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