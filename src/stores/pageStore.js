// src/stores/pageStore.js - FIXED VERSION
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
      
      // Enhanced state tracking
      lastLoadedPageId: null,
      
      // Actions
      setLoading: (isLoading) => {
        console.log('PageStore: Setting loading state:', isLoading);
        set({ isLoading });
      },
      
      setSaving: (isSaving) => {
        console.log('PageStore: Setting saving state:', isSaving);
        set({ isSaving });
      },
      
      setError: (error) => {
        console.log('PageStore: Setting error:', error);
        set({ error });
      },
      
      // FIXED: Simplified current page data management
      setCurrentPageData: (pageData) => {
        console.log('PageStore: Setting current page data:', pageData?.id);
        set({ 
          currentPageData: pageData,
          lastLoadedPageId: pageData?.id || null
        });
      },
      
      // FIXED: Enhanced save with better error handling
      savePage: async (pageData) => {
        console.log('=== PageStore: SAVE PAGE START ===');
        console.log('Page data received:', {
          notebookId: pageData.notebookId,
          pageNumber: pageData.pageNumber,
          hasCanvasData: !!pageData.canvasData,
          canvasDataLength: pageData.canvasData?.length || 0,
          hasSettings: !!pageData.settings
        });
        
        try {
          set({ isSaving: true, error: null });
          
          const { notebookId, pageNumber, canvasData, settings } = pageData;
          const pageId = `${notebookId}_page_${pageNumber}`;
          
          // Validate required data
          if (!notebookId || !pageNumber) {
            throw new Error('Missing required notebook ID or page number');
          }
          
          // FIXED: Better canvas data handling
          let finalCanvasData = canvasData;
          if (!finalCanvasData || finalCanvasData.trim() === '') {
            finalCanvasData = JSON.stringify({
              type: 'drawing',
              version: 1,
              elements: [],
              appState: {
                width: 1600,
                height: 870,
                opacity: 100
              }
            });
          }
          
          // Validate JSON format
          try {
            JSON.parse(finalCanvasData);
          } catch (jsonError) {
            console.error('PageStore: Invalid canvas data JSON:', jsonError);
            finalCanvasData = JSON.stringify({
              type: 'drawing',
              version: 1,
              elements: [],
              appState: { width: 870, height: 870, opacity: 100 }
            });
          }
          
          // Ensure we have settings
          const finalSettings = settings || {
            pattern: 'grid',
            patternSize: 20,
            patternColor: '#e5e7eb',
            patternOpacity: 50
          };
          
          const page = {
            id: pageId,
            notebookId,
            pageNumber,
            canvasData: finalCanvasData,
            settings: finalSettings,
            lastModified: new Date().toISOString(),
            version: 1
          };
          
          console.log('PageStore: Prepared page object:', {
            id: page.id,
            canvasDataLength: page.canvasData.length,
            settings: page.settings
          });
          
          // Save to Electron if available
          if (electronService.isElectron) {
            console.log('PageStore: Saving to Electron...');
            const result = await electronService.savePage(page);
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to save page to file system');
            }
            
            console.log('PageStore: Successfully saved to file system');
          } else {
            console.log('PageStore: Web mode - saving to localStorage only');
          }
          
          // FIXED: Update state simply
          set(state => {
            const newPages = { ...state.pages, [pageId]: page };
            
            return {
              pages: newPages,
              currentPageData: page,
              isSaving: false,
              lastLoadedPageId: pageId
            };
          });
          
          console.log('=== PageStore: SAVE PAGE SUCCESS ===');
          return { success: true, page };
          
        } catch (error) {
          console.error('=== PageStore: SAVE PAGE ERROR ===', error);
          set({ error: error.message, isSaving: false });
          return { success: false, error: error.message };
        }
      },
      
      // FIXED: Simplified load without problematic caching
      loadPage: async (notebookId, pageNumber) => {
        // console.log('=== PageStore: LOAD PAGE START ===');
        // console.log('Loading page:', { notebookId, pageNumber });
        
        try {
          set({ isLoading: true, error: null });
          
          const pageId = `${notebookId}_page_${pageNumber}`;
          // console.log('PageStore: Generated page ID:', pageId);
          
          const state = get();
          let page = null;
          
          // Always try to load from Electron first for fresh data
          if (electronService.isElectron) {
            // console.log('PageStore: Loading from file system...');
            const result = await electronService.loadPage(pageId);
            
            // console.log('PageStore: File system load result:', {
            //   success: result.success,
            //   error: result.error,
            //   hasPage: !!result.page
            // });
            
            if (result.success && result.page) {
              page = result.page;
              // console.log('PageStore: Loaded from file system:', {
              //   id: page.id,
              //   hasCanvasData: !!page.canvasData,
              //   canvasDataLength: page.canvasData?.length || 0,
              //   hasSettings: !!page.settings
              // });
            } else if (result.error && result.error !== 'Page not found') {
              throw new Error(result.error);
            }
          }
          
          // Fall back to store only if Electron failed and page not found
          if (!page) {
            page = state.pages[pageId];
            // console.log('PageStore: Found in store:', !!page);
          }
          
          // FIXED: Create default page with better structure
          if (!page) {
            // console.log('PageStore: Creating default page:', pageId);
            page = {
              id: pageId,
              notebookId,
              pageNumber,
              canvasData: JSON.stringify({
                type: 'drawing',
                version: 1,
                elements: [],
                appState: {
                  width: 1600,
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
              lastModified: new Date().toISOString(),
              version: 1
            };
            
            // console.log('PageStore: Created default page, saving immediately...');
            
            // Save the default page immediately
            if (electronService.isElectron) {
              const saveResult = await electronService.savePage(page);
              if (!saveResult.success) {
                console.warn('PageStore: Failed to save default page:', saveResult.error);
              } else {
                console.log('PageStore: Default page saved to file system');
              }
            }
          }
          
          // FIXED: Ensure page has all required properties
          if (!page.settings) {
            // console.log('PageStore: Adding missing settings to loaded page');
            page.settings = {
              pattern: 'grid',
              patternSize: 20,
              patternColor: '#e5e7eb',
              patternOpacity: 50
            };
          }
          
          if (!page.canvasData) {
            // console.log('PageStore: Adding missing canvas data to loaded page');
            page.canvasData = JSON.stringify({
              type: 'drawing',
              version: 1,
              elements: [],
              appState: { width: 870, height: 870, opacity: 100 }
            });
          }
          
          // Validate canvas data JSON
          try {
            JSON.parse(page.canvasData);
          } catch (jsonError) {
            console.warn('PageStore: Invalid canvas data JSON, fixing...');
            page.canvasData = JSON.stringify({
              type: 'drawing',
              version: 1,
              elements: [],
              appState: { width: 870, height: 870, opacity: 100 }
            });
          }
          
          // FIXED: Update state without aggressive caching
          set(state => {
            const newPages = { ...state.pages, [pageId]: page };
            
            return {
              pages: newPages,
              currentPageData: page,
              isLoading: false,
              lastLoadedPageId: pageId
            };
          });
          
          // // console.log('=== PageStore: LOAD PAGE SUCCESS ===');
          // // console.log('Final page data:', {
          //   id: page.id,
          //   hasCanvasData: !!page.canvasData,
          //   canvasDataLength: page.canvasData?.length || 0,
          //   hasSettings: !!page.settings,
          //   settings: page.settings
          // });
          
          return { success: true, page };
          
        } catch (error) {
          // console.error('=== PageStore: LOAD PAGE ERROR ===', error);
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      // Delete page with Electron integration
      deletePage: async (pageId) => {
        try {
          // console.log('PageStore: Deleting page:', pageId);
          
          // Delete from Electron if available
          if (electronService.isElectron) {
            const result = await electronService.deletePage(pageId);
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to delete page');
            }
            
            // console.log('PageStore: Page deleted from file system');
          }
          
          // Remove from state
          set(state => {
            const newPages = { ...state.pages };
            delete newPages[pageId];
            
            // Clear current page data if it was the deleted page
            const newCurrentPageData = state.currentPageData?.id === pageId ? null : state.currentPageData;
            
            return { 
              pages: newPages,
              currentPageData: newCurrentPageData,
              lastLoadedPageId: state.lastLoadedPageId === pageId ? null : state.lastLoadedPageId
            };
          });
          
          // console.log('PageStore: Page deleted from state');
          return { success: true };
          
        } catch (error) {
          console.error('PageStore: Error deleting page:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        }
      },
      
      // Load all pages for a notebook from Electron
      loadPagesByNotebook: async (notebookId) => {
        try {
          set({ isLoading: true, error: null });
          // console.log('PageStore: Loading all pages for notebook:', notebookId);
          
          if (electronService.isElectron) {
            const result = await electronService.loadPagesByNotebook(notebookId);
            
            if (result.success) {
              // console.log('PageStore: Loaded pages from file system:', result.pages.length);
              
              // Update pages state with loaded pages
              set(state => {
                const newPages = { ...state.pages };
                
                result.pages.forEach(page => {
                  newPages[page.id] = page;
                });
                
                return {
                  pages: newPages,
                  isLoading: false
                };
              });
              
              return result.pages;
            } else {
              throw new Error(result.error || 'Failed to load pages');
            }
          } else {
            // Web version - get from state
            const pages = get().getPagesByNotebook(notebookId);
            set({ isLoading: false });
            // console.log('PageStore: Retrieved pages from state:', pages.length);
            return pages;
          }
        } catch (error) {
          console.error('PageStore: Error loading pages:', error);
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
      
      // FIXED: Clear current page data
      clearCurrentPageData: () => {
        // console.log('PageStore: Clearing current page data');
        set({ 
          currentPageData: null,
          lastLoadedPageId: null
        });
      },
      
      // Utility methods
      getPages: () => get().pages,
      setPages: (pages) => set({ pages }),
      
      // Initialize store
      initialize: async () => {
        // console.log('PageStore: Initializing...');
        // Page store doesn't need initialization like notebooks
        // Pages are loaded on demand
      }
    }),
    {
      name: 'drawo-pages',
      getStorage: () => localStorage,
      // Only persist in web mode
      skipHydration: electronService.isElectron,
      // Don't persist cache to avoid stale data
      partialize: (state) => ({
        pages: state.pages,
      })
    }
  )
);