// src/stores/notebookStore.js - Updated with Electron integration
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import electronService from '../services/ElectronService';

export const useNotebookStore = create(
  persist(
    (set, get) => ({
      // State
      notebooks: [],
      currentNotebookId: null,
      searchQuery: '',
      isLoading: false,
      error: null,
      
      // Computed values
      get filteredNotebooks() {
        const { notebooks, searchQuery } = get();
        if (!searchQuery.trim()) return notebooks;
        
        return notebooks.filter(notebook => 
          notebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          notebook.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      },
      
      get currentNotebook() {
        return get().notebooks.find(nb => nb.id === get().currentNotebookId) || null;
      },
      
      // Actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCurrentNotebook: (id) => set({ currentNotebookId: id }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      
      // Add notebook with Electron integration
      addNotebook: async (notebookData) => {
        try {
          set({ isLoading: true, error: null });

          const newNotebook = {
            id: Date.now().toString(), // Convert to string for consistency
            ...notebookData,
            pages: [],
            currentPage: 1,
            progress: 0,
            createdAt: new Date().toISOString(),
            gradient: getGradientForColor(notebookData.color)
          };
          
          // Save to Electron if available
          if (electronService.isElectron) {
            const result = await electronService.saveNotebook(newNotebook);
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to save notebook');
            }
          }
          
          // Update state
          set(state => ({
            notebooks: [newNotebook, ...state.notebooks],
            isLoading: false
          }));
          
          return newNotebook;
        } catch (error) {
          console.error('Error adding notebook:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      // Update notebook with Electron integration
      updateNotebook: async (id, updates) => {
        try {
          const state = get();
          const notebook = state.notebooks.find(nb => nb.id === id);
          
          if (!notebook) {
            throw new Error('Notebook not found');
          }
          
          const updatedNotebook = { ...notebook, ...updates };
          
          // Save to Electron if available
          if (electronService.isElectron) {
            const result = await electronService.saveNotebook(updatedNotebook);
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to update notebook');
            }
          }
          
          // Update state
          set(state => ({
            notebooks: state.notebooks.map(notebook => 
              notebook.id === id ? updatedNotebook : notebook
            )
          }));
          
          return updatedNotebook;
        } catch (error) {
          console.error('Error updating notebook:', error);
          set({ error: error.message });
          throw error;
        }
      },
      
      // Delete notebook with Electron integration
      deleteNotebook: async (id) => {
        try {
          set({ isLoading: true, error: null });
          
          // Delete from Electron if available
          if (electronService.isElectron) {
            const result = await electronService.deleteNotebook(id);
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to delete notebook');
            }
          }
          
          // Update state
          set(state => ({
            notebooks: state.notebooks.filter(notebook => notebook.id !== id),
            currentNotebookId: state.currentNotebookId === id ? null : state.currentNotebookId,
            isLoading: false
          }));
          
        } catch (error) {
          console.error('Error deleting notebook:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      // Load all notebooks from Electron
      loadNotebooks: async () => {
        try {
          set({ isLoading: true, error: null });
          
          if (electronService.isElectron) {
            const result = await electronService.loadAllNotebooks();
            
            if (result.success) {
              // Add gradients to loaded notebooks if missing
              const notebooksWithGradients = result.notebooks.map(notebook => ({
                ...notebook,
                gradient: notebook.gradient || getGradientForColor(notebook.color)
              }));
              
              set({ notebooks: notebooksWithGradients, isLoading: false });
            } else {
              throw new Error(result.error || 'Failed to load notebooks');
            }
          } else {
            // Web version - data is already persisted via Zustand
            console.log('Running in web mode, using persisted data');
            set({ isLoading: false });
          }
          
        } catch (error) {
          console.error('Error loading notebooks:', error);
          set({ error: error.message, isLoading: false });
        }
      },
      
      // Page Operations
      updateCurrentPage: async (pageNumber) => {
        const { currentNotebookId } = get();
        if (!currentNotebookId) return;
        
        try {
          await get().updateNotebook(currentNotebookId, { currentPage: pageNumber });
        } catch (error) {
          console.error('Error updating current page:', error);
        }
      },
      
      addPageToNotebook: async (notebookId, pageId) => {
        try {
          const state = get();
          const notebook = state.notebooks.find(nb => nb.id === notebookId);
          
          if (!notebook) return;
          
          const pageExists = notebook.pages.includes(pageId);
          if (pageExists) return;
          
          const updatedPages = [...notebook.pages, pageId];
          await get().updateNotebook(notebookId, { pages: updatedPages });
          
        } catch (error) {
          console.error('Error adding page to notebook:', error);
        }
      },
      
      updateNotebookProgress: async (notebookId, currentPage) => {
        try {
          const state = get();
          const notebook = state.notebooks.find(nb => nb.id === notebookId);
          
          if (!notebook) return;
          
          const totalPages = notebook.totalPages || notebook.pages || 100;
          const progress = Math.round((currentPage / totalPages) * 100);
          
          await get().updateNotebook(notebookId, { currentPage, progress });
          
        } catch (error) {
          console.error('Error updating notebook progress:', error);
        }
      },
      
      // Utility methods
      getNotebooks: () => get().notebooks,
      setNotebooks: (notebooks) => set({ notebooks }),
      
      // Initialize store (call this on app startup)
      initialize: async () => {
        console.log('Initializing notebook store...');
        await get().loadNotebooks();
      }
    }),
    {
      name: 'drawo-notebooks',
      getStorage: () => localStorage,
      // Only persist in web mode
      skipHydration: electronService.isElectron,
    }
  )
);

// Helper for gradient generation
function getGradientForColor(color) {
  const colorGradients = {
    '#8b5cf6': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
    '#ef4444': 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
    '#f59e0b': 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
    '#10b981': 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
    '#3b82f6': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
    '#ec4899': 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)',
    '#14b8a6': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
    '#f97316': 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)'
  };
  
  return colorGradients[color] || colorGradients['#8b5cf6'];
}