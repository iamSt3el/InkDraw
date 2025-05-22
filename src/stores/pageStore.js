// src/stores/pageStore.js - Updated with Electron integration
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import electronService from '../services/ElectronService';

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
      
      setCurrentPageData: (pageData) => {
        console.log('Setting current page data:', pageData?.id);
        set({ currentPageData: pageData });
      },
      
      // Save page with Electron integration
      savePage: async (pageData) => {
        try {
          set({ isSaving: true, error: null });
          
          const { notebookId, pageNumber, canvasData, settings } = pageData;
          const pageId = `${notebookId}_page_${pageNumber}`;
          
          console.log('Saving page:', pageId, 'with settings:', settings);
          
          const page = {
            id: pageId,
            notebookId,
            pageNumber,
            canvasData,
            settings: settings || {
              pattern: 'grid',
              patternSize: 20,
              patternColor: '#e5e7eb',
              patternOpacity: 50
            },
            lastModified: new Date().toISOString()
          };
          
          // Save to Electron if available
          if (electronService.isElectron) {
            const result = await electronService.savePage(page);
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to save page');
            }
            
            console.log('Page saved successfully to file system');
          }
          
          // Update state
          set(state => ({
            pages: {
              ...state.pages,
              [pageId]: page
            },
            currentPageData: page,
            isSaving: false
          }));
          
          console.log('Page state updated successfully');
          return { success: true, page };
        } catch (error) {
          console.error('Error saving page:', error);
          set({ error: error.message, isSaving: false });
          return { success: false, error: error.message };
        }
      },
      
      // Load page with Electron integration
      loadPage: async (notebookId, pageNumber) => {
        try {
          set({ isLoading: true, error: null });
          
          const pageId = `${notebookId}_page_${pageNumber}`;
          console.log('Loading page:', pageId);
          
          let page = get().pages[pageId];
          
          // If not in store, try to load from Electron
          if (!page && electronService.isElectron) {
            console.log('Page not found in store, loading from file system...');
            const result = await electronService.loadPage(pageId);
            
            if (result.success) {
              page = result.page;
              console.log('Page loaded from file system:', page.id);
              
              // Update store with loaded page
              set(state => ({
                pages: {
                  ...state.pages,
                  [pageId]: page
                }
              }));
            } else if (result.error !== 'Page not found') {
              throw new Error(result.error);
            }
          }
          
          // Create default page if not found
          if (!page) {
            console.log('Creating default page:', pageId);
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
                  height: 870,
                  opacity: 100
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
            
            // Save the default page immediately
            if (electronService.isElectron) {
              await electronService.savePage(page);
            }
          }
          
          set({ 
            currentPageData: page, 
            isLoading: false,
            pages: {
              ...get().pages,
              [pageId]: page
            } 
          });
          
          console.log('Page loaded successfully:', page.id);
          return { success: true, page };
        } catch (error) {
          console.error('Error loading page:', error);
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Delete page with Electron integration
      deletePage: async (pageId) => {
        try {
          // Delete from Electron if available
          if (electronService.isElectron) {
            const result = await electronService.deletePage(pageId);
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to delete page');
            }
          }
          
          // Remove from state
          set(state => {
            const newPages = { ...state.pages };
            delete newPages[pageId];
            
            // Clear current page data if it was the deleted page
            const newCurrentPageData = state.currentPageData?.id === pageId ? null : state.currentPageData;
            
            return { 
              pages: newPages, 
              currentPageData: newCurrentPageData 
            };
          });
          
          return { success: true };
        } catch (error) {
          console.error('Error deleting page:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        }
      },
      
      // Load all pages for a notebook from Electron
      loadPagesByNotebook: async (notebookId) => {
        try {
          set({ isLoading: true, error: null });
          
          if (electronService.isElectron) {
            const result = await electronService.loadPagesByNotebook(notebookId);
            
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
              throw new Error(result.error || 'Failed to load pages');
            }
          } else {
            // Web version - get from state
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
      
      // Get all pages for a notebook (from state)
      getPagesByNotebook: (notebookId) => {
        const allPages = get().pages;
        return Object.values(allPages)
          .filter(page => page.notebookId === notebookId)
          .sort((a, b) => a.pageNumber - b.pageNumber);
      },
      
      // Clear current page data
      clearCurrentPageData: () => set({ currentPageData: null }),
      
      // Utility methods
      getPages: () => get().pages,
      setPages: (pages) => set({ pages }),
      
      // Initialize store
      initialize: async () => {
        console.log('Initializing page store...');
        // Page store doesn't need initialization like notebooks
        // Pages are loaded on demand
      }
    }),
    {
      name: 'drawo-pages',
      getStorage: () => localStorage,
      // Only persist in web mode
      skipHydration: electronService.isElectron,
    }
  )
);