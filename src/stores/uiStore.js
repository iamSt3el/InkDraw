// src/stores/uiStore.js
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
  notification: null, // { type: 'success' | 'error' | 'info', message: string, duration: number }
  
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
  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),
  setError: (error) => set({ error }),
  
  // Show notification
  showNotification: (type, message, duration = 3000) => {
    set({ notification: { type, message, duration } });
    
    // Auto-hide after duration
    setTimeout(() => {
      set(state => {
        // Only clear if it's the same notification
        if (state.notification && state.notification.message === message) {
          return { notification: null };
        }
        return {};
      });
    }, duration);
  },
  
  // Clear notification
  clearNotification: () => set({ notification: null }),
  
  // Show/hide specific panel
  showPanel: (panelName) => {
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
        break;
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