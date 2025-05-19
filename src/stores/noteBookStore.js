// src/stores/notebookStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      
      addNotebook: (notebookData) => {
        const newNotebook = {
          id: Date.now(), // Simple ID generation
          ...notebookData,
          pages: [],
          currentPage: 1,
          progress: 0,
          createdAt: new Date().toISOString(),
          gradient: getGradientForColor(notebookData.color)
        };
        
        set(state => ({
          notebooks: [newNotebook, ...state.notebooks]
        }));
        
        return newNotebook;
      },
      
      updateNotebook: (id, updates) => {
        set(state => ({
          notebooks: state.notebooks.map(notebook => 
            notebook.id === id ? { ...notebook, ...updates } : notebook
          )
        }));
      },
      
      deleteNotebook: (id) => {
        set(state => ({
          notebooks: state.notebooks.filter(notebook => notebook.id !== id),
          // Reset current notebook if it was deleted
          currentNotebookId: state.currentNotebookId === id ? null : state.currentNotebookId
        }));
      },
      
      // Page Operations
      updateCurrentPage: (pageNumber) => {
        set(state => {
          const { currentNotebookId, notebooks } = state;
          if (!currentNotebookId) return state;
          
          return {
            notebooks: notebooks.map(notebook => 
              notebook.id === currentNotebookId 
                ? { ...notebook, currentPage: pageNumber } 
                : notebook
            )
          };
        });
      },
      
      addPageToNotebook: (notebookId, pageId) => {
        set(state => {
          const { notebooks } = state;
          
          return {
            notebooks: notebooks.map(notebook => {
              if (notebook.id !== notebookId) return notebook;
              
              const pageExists = notebook.pages.includes(pageId);
              if (pageExists) return notebook;
              
              return {
                ...notebook,
                pages: [...notebook.pages, pageId]
              };
            })
          };
        });
      },
      
      updateNotebookProgress: (notebookId, currentPage) => {
        set(state => {
          const { notebooks } = state;
          
          return {
            notebooks: notebooks.map(notebook => {
              if (notebook.id !== notebookId) return notebook;
              
              const totalPages = notebook.totalPages || 100;
              const progress = Math.round((currentPage / totalPages) * 100);
              
              return {
                ...notebook,
                currentPage,
                progress
              };
            })
          };
        });
      },
      
      // Load all notebooks (for Electron integration)
      loadNotebooks: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // For Electron integration
          if (window.electron && window.electron.ipcRenderer) {
            const result = await window.electron.ipcRenderer.invoke('data-load-all-notebooks');
            if (result.success) {
              set({ notebooks: result.notebooks });
            } else {
              throw new Error(result.error);
            }
          } else {
            // For web version, notebooks are already in store thanks to persist
            // Just load from localStorage if needed
            const savedNotebooks = localStorage.getItem('drawo-notebooks-backup');
            if (savedNotebooks) {
              try {
                set({ notebooks: JSON.parse(savedNotebooks) });
              } catch (e) {
                console.error('Failed to parse saved notebooks', e);
              }
            }
          }
          
          set({ isLoading: false });
        } catch (error) {
          console.error('Error loading notebooks:', error);
          set({ error: error.message, isLoading: false });
        }
      },
      
      // For non-React code to get notebooks
      getNotebooks: () => get().notebooks,
      
      // Bulk update notebooks (for sync operations)
      setNotebooks: (notebooks) => set({ notebooks })
    }),
    {
      name: 'drawo-notebooks', // localStorage key
      getStorage: () => localStorage, // storage function
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
  
  return colorGradients[color] || colorGradients['#8b5cf6']; // Default gradient
}