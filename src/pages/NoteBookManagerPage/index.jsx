
import React, { useEffect, useState } from 'react'
import styles from './NoteBookManager.module.scss'
import Header from '../../components/Header';
import NoteBookCard from '../../components/NotebookCard';
import { useNotebookStore } from '../../stores/noteBookStore';

const NoteBookManager = () => {
  const { 
    notebooks, 
    isLoading, 
    error, 
    loadNotebooks
  } = useNotebookStore();

  const [hasInitialized, setHasInitialized] = useState(false);

  
  useEffect(() => {
    const initializeNotebooks = async () => {
      if (!hasInitialized) {
        console.log('NotebookManager: Loading notebooks...');
        await loadNotebooks();
        setHasInitialized(true);
      }
    };

    initializeNotebooks();
  }, [loadNotebooks, hasInitialized]);

  
  useEffect(() => {
    console.log('=== NotebookManager Debug ===');
    console.log('Raw notebooks from store:', notebooks);
    console.log('Notebooks count:', notebooks?.length || 0);
    console.log('Loading state:', isLoading);
    console.log('Error state:', error);
    console.log('Has initialized:', hasInitialized);
    
    
    if (notebooks && notebooks.length > 0) {
      notebooks.forEach((notebook, index) => {
        console.log(`Notebook ${index}:`, {
          id: notebook.id,
          title: notebook.title,
          description: notebook.description,
          color: notebook.color
        });
      });
    }
    console.log('=== End Debug ===');
  }, [notebooks, isLoading, error, hasInitialized]);

  const renderContent = () => {
    console.log('NotebookManager renderContent called');
    console.log('Notebooks for rendering:', notebooks);
    console.log('Notebooks length:', notebooks?.length);
    
    if (isLoading && !hasInitialized) {
      console.log('Rendering loading state');
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading notebooks...</p>
        </div>
      );
    }

    if (error) {
      console.log('Rendering error state:', error);
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Error Loading Notebooks</h3>
          <p>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={() => {
              setHasInitialized(false);
              loadNotebooks();
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    if (!notebooks || notebooks.length === 0) {
      console.log('Rendering empty state - notebooks:', notebooks);
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📓</div>
          <h3>No Notebooks Yet</h3>
          <p>Create your first notebook to get started with drawing and note-taking.</p>
        </div>
      );
    }

    console.log('Rendering notebooks grid with', notebooks.length, 'notebooks');
    return (
      <div className={styles.notebooksGrid}>
        {notebooks.map((notebook, index) => {
          console.log(`Rendering notebook ${index}:`, notebook);
          return (
            <NoteBookCard 
              key={notebook.id || index} 
              notebook={notebook}
            />
          );
        })}
      </div>
    );
  };

  console.log('NotebookManager render - notebooks:', notebooks?.length || 0);

  return (
    <div className={styles.nm_cover}>
      <div className={styles.nm_header}>
        <Header/>
      </div>

      <div className={styles.nm_notebooks}>
        <div className={styles.notebooksHeader}>
          <h1>My Notebooks</h1>
          <div className={styles.notebooksCount}>
            {notebooks?.length || 0} {(notebooks?.length || 0) === 1 ? 'notebook' : 'notebooks'}
          </div>
        </div>
        
        {renderContent()}
      </div>
    </div>
  )
}

export default NoteBookManager;