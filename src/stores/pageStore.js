// src/stores/pageStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePageStore = create(
  persist(
    (set, get) => ({
      // State
      pages: {}, // Object storing pages by ID
      currentPageData: null, // Current page's data
      isLoading: false, 
      isSaving: false,
      error: null,
      
      // Actions
      setLoading: (isLoading) => set({ isLoading }),
      setSaving: (isSaving) => set({ isSaving }),
      setError: (error) => set({ error }),
      
      setCurrentPageData: (pageData) => set({ currentPageData: pageData }),
      
      savePage: async (pageData) => {
        try {
          set({ isSaving: true, error: null });
          
          const { notebookId, pageNumber, canvasData, settings } = pageData;
          const pageId = `${notebookId}_page_${pageNumber}`;
          
          const page = {
            id: pageId,
            notebookId,
            pageNumber,
            canvasData,
            settings,
            lastModified: new Date().toISOString()
          };
          
          // Save to storage
          if (window.electron && window.electron.ipcRenderer) {
            // Electron version
            const result = await window.electron.ipcRenderer.invoke('data-save-page', page);
            
            if (!result.success) {
              throw new Error(result.error);
            }
          } else {
            // Web version - just update the state
            // No extra storage operation needed due to persist middleware
          }
          
          // Update pages state
          set(state => ({
            pages: {
              ...state.pages,
              [pageId]: page
            },
            isSaving: false
          }));
          
          return { success: true, page };
        } catch (error) {
          console.error('Error saving page:', error);
          set({ error: error.message, isSaving: false });
          return { success: false, error: error.message };
        }
      },
      
      loadPage: async (notebookId, pageNumber) => {
        try {
          set({ isLoading: true, error: null });
          
          const pageId = `${notebookId}_page_${pageNumber}`;
          let page = get().pages[pageId];
          
          // If not in store, try to load from storage
          if (!page && window.electron && window.electron.ipcRenderer) {
            const result = await window.electron.ipcRenderer.invoke('data-load-page', pageId);
            
            if (result.success) {
              page = result.page;
              
              // Update store with loaded page
              set(state => ({
                pages: {
                  ...state.pages,
                  [pageId]: page
                }
              }));
            } else if (result.error === 'Page not found') {
              // Create default empty page
              page = {
                id: pageId,
                notebookId,
                pageNumber,
                canvasData: JSON.stringify({
                  type: 'drawing',
                  version: 1,
                  elements: [],
                  appState: {
                    width: 870,
                    height: 870
                  }
                }),
                settings: {
                  pattern: 'grid',
                  patternSize: 20,
                  patternColor: '#e5e7eb',
                  patternOpacity: 50
                },
                lastModified: new Date().toISOString()
              };
            } else {
              throw new Error(result.error);
            }
          } else if (!page) {
            // Web version - create default page if not found
            page = {
              id: pageId,
              notebookId,
              pageNumber,
              canvasData: JSON.stringify({
                type: 'drawing',
                version: 1,
                elements: [],
                appState: {
                  width: 870,
                  height: 870
                }
              }),
              settings: {
                pattern: 'grid',
                patternSize: 20,
                patternColor: '#e5e7eb',
                patternOpacity: 50
              },
              lastModified: new Date().toISOString()
            };
          }
          
          set({ 
            currentPageData: page, 
            isLoading: false,
            pages: {
              ...get().pages,
              [pageId]: page
            } 
          });
          
          return { success: true, page };
        } catch (error) {
          console.error('Error loading page:', error);
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      deletePage: async (pageId) => {
        try {
          // Delete from storage
          if (window.electron && window.electron.ipcRenderer) {
            const result = await window.electron.ipcRenderer.invoke('data-delete-page', pageId);
            
            if (!result.success) {
              throw new Error(result.error);
            }
          }
          
          // Remove from state
          set(state => {
            const newPages = { ...state.pages };
            delete newPages[pageId];
            return { pages: newPages };
          });
          
          return { success: true };
        } catch (error) {
          console.error('Error deleting page:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        }
      },
      
      // Get all pages for a notebook
      getPagesByNotebook: (notebookId) => {
        const allPages = get().pages;
        return Object.values(allPages)
          .filter(page => page.notebookId === notebookId)
          .sort((a, b) => a.pageNumber - b.pageNumber);
      },
      
      // Load all pages for a notebook from storage
      loadPagesByNotebook: async (notebookId) => {
        try {
          set({ isLoading: true, error: null });
          
          if (window.electron && window.electron.ipcRenderer) {
            const result = await window.electron.ipcRenderer.invoke('data-load-pages-by-notebook', notebookId);
            
            if (result.success) {
              // Update pages state with loaded pages
              const pagesMap = {};
              result.pages.forEach(page => {
                pagesMap[page.id] = page;
              });
              
              set(state => ({
                pages: {
                  ...state.pages,
                  ...pagesMap
                },
                isLoading: false
              }));
              
              return result.pages;
            } else {
              throw new Error(result.error);
            }
          } else {
            // Web version - already have all pages in state
            const pages = get().getPagesByNotebook(notebookId);
            set({ isLoading: false });
            return pages;
          }
        } catch (error) {
          console.error('Error loading pages:', error);
          set({ error: error.message, isLoading: false });
          return [];
        }
      },
      
      // Clear current page data
      clearCurrentPageData: () => set({ currentPageData: null }),
      
      // For non-React code to get pages
      getPages: () => get().pages,
      
      // Bulk update pages (for sync operations)
      setPages: (pages) => set({ pages })
    }),
    {
      name: 'drawo-pages', // localStorage key
      getStorage: () => localStorage, // storage function
    }
  )
);