
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import electronService from '../services/ElectronService';

export const usePageStore = create(
  persist(
    (set, get) => ({
      
      pages: {}, 
      currentPageData: null, 
      isLoading: false, 
      isSaving: false,
      error: null,
      
      
      lastLoadedPageId: null,
      
      
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
      
      
      setCurrentPageData: (pageData) => {
        console.log('PageStore: Setting current page data:', pageData?.id);
        set({ 
          currentPageData: pageData,
          lastLoadedPageId: pageData?.id || null
        });
      },
      
      
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
          
          
          if (!notebookId || !pageNumber) {
            throw new Error('Missing required notebook ID or page number');
          }
          
          
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
      
      
      loadPage: async (notebookId, pageNumber) => {
        
        
        
        try {
          set({ isLoading: true, error: null });
          
          const pageId = `${notebookId}_page_${pageNumber}`;
          
          
          const state = get();
          let page = null;
          
          
          if (electronService.isElectron) {
            
            const result = await electronService.loadPage(pageId);
            
            
            
            
            
            
            
            if (result.success && result.page) {
              page = result.page;
              
              
              
              
              
              
            } else if (result.error && result.error !== 'Page not found') {
              throw new Error(result.error);
            }
          }
          
          
          if (!page) {
            page = state.pages[pageId];
            
          }
          
          
          if (!page) {
            
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
            
            
            
            
            if (electronService.isElectron) {
              const saveResult = await electronService.savePage(page);
              if (!saveResult.success) {
                console.warn('PageStore: Failed to save default page:', saveResult.error);
              } else {
                console.log('PageStore: Default page saved to file system');
              }
            }
          }
          
          
          if (!page.settings) {
            
            page.settings = {
              pattern: 'grid',
              patternSize: 20,
              patternColor: '#e5e7eb',
              patternOpacity: 50
            };
          }
          
          if (!page.canvasData) {
            
            page.canvasData = JSON.stringify({
              type: 'drawing',
              version: 1,
              elements: [],
              appState: { width: 870, height: 870, opacity: 100 }
            });
          }
          
          
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
          
          
          set(state => {
            const newPages = { ...state.pages, [pageId]: page };
            
            return {
              pages: newPages,
              currentPageData: page,
              isLoading: false,
              lastLoadedPageId: pageId
            };
          });
          
          
          
          
          
          
          
          
          
          
          return { success: true, page };
          
        } catch (error) {
          
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
      
      
      deletePage: async (pageId) => {
        try {
          
          
          
          if (electronService.isElectron) {
            const result = await electronService.deletePage(pageId);
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to delete page');
            }
            
            
          }
          
          
          set(state => {
            const newPages = { ...state.pages };
            delete newPages[pageId];
            
            
            const newCurrentPageData = state.currentPageData?.id === pageId ? null : state.currentPageData;
            
            return { 
              pages: newPages,
              currentPageData: newCurrentPageData,
              lastLoadedPageId: state.lastLoadedPageId === pageId ? null : state.lastLoadedPageId
            };
          });
          
          
          return { success: true };
          
        } catch (error) {
          console.error('PageStore: Error deleting page:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        }
      },
      
      
      loadPagesByNotebook: async (notebookId) => {
        try {
          set({ isLoading: true, error: null });
          
          
          if (electronService.isElectron) {
            const result = await electronService.loadPagesByNotebook(notebookId);
            
            if (result.success) {
              
              
              
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
            
            const pages = get().getPagesByNotebook(notebookId);
            set({ isLoading: false });
            
            return pages;
          }
        } catch (error) {
          console.error('PageStore: Error loading pages:', error);
          set({ error: error.message, isLoading: false });
          return [];
        }
      },
      
      
      getPagesByNotebook: (notebookId) => {
        const allPages = get().pages;
        return Object.values(allPages)
          .filter(page => page.notebookId === notebookId)
          .sort((a, b) => a.pageNumber - b.pageNumber);
      },
      
      
      clearCurrentPageData: () => {
        
        set({ 
          currentPageData: null,
          lastLoadedPageId: null
        });
      },
      
      
      getPages: () => get().pages,
      setPages: (pages) => set({ pages }),
      
      
      initialize: async () => {
        
        
        
      }
    }),
    {
      name: 'drawo-pages',
      getStorage: () => localStorage,
      
      skipHydration: electronService.isElectron,
      
      partialize: (state) => ({
        pages: state.pages,
      })
    }
  )
);