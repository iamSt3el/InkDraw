
import React from 'react';
import { useNotebookStore } from '../../stores/noteBookStore';
import electronService from '../../services/ElectronService';

const DebugPanel = () => {
  const { notebooks, addNotebook, loadNotebooks, isLoading, error } = useNotebookStore();

  const handleTestCreateNotebook = async () => {
    try {
      console.log('Creating test notebook...');
      const testNotebook = {
        title: 'Test Notebook',
        description: 'This is a test notebook created for debugging',
        color: '#8b5cf6',
        totalPages: 100
      };
      
      await addNotebook(testNotebook);
      console.log('Test notebook created successfully');
    } catch (error) {
      console.error('Error creating test notebook:', error);
    }
  };

  const handleTestLoadNotebooks = async () => {
    try {
      console.log('Loading notebooks...');
      await loadNotebooks();
      console.log('Notebooks loaded successfully');
    } catch (error) {
      console.error('Error loading notebooks:', error);
    }
  };

  const handleTestElectronService = async () => {
    console.log('Testing Electron service...');
    console.log('Is Electron:', electronService.isElectron);
    console.log('Electron API available:', !!electronService.api);
    
    if (electronService.isElectron) {
      try {
        const result = await electronService.loadAllNotebooks();
        console.log('Electron service test result:', result);
      } catch (error) {
        console.error('Electron service test error:', error);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'white',
      border: '2px solid #8b5cf6',
      borderRadius: '8px',
      padding: '1rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      zIndex: 9999,
      fontSize: '12px',
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 1rem 0', color: '#8b5cf6' }}>Debug Panel</h4>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Notebooks Count:</strong> {notebooks.length}
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Error:</strong> {error || 'None'}
      </div>
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Electron:</strong> {electronService.isElectron ? 'Yes' : 'No'}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button 
          onClick={handleTestCreateNotebook}
          style={{
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            padding: '0.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Create Test Notebook
        </button>
        
        <button 
          onClick={handleTestLoadNotebooks}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '0.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Load Notebooks
        </button>
        
        <button 
          onClick={handleTestElectronService}
          style={{
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            padding: '0.5rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Test Electron Service
        </button>
      </div>
      
      {notebooks.length > 0 && (
        <div style={{ marginTop: '1rem', fontSize: '10px' }}>
          <strong>Notebooks:</strong>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
            {notebooks.slice(0, 3).map(nb => (
              <li key={nb.id}>{nb.title}</li>
            ))}
            {notebooks.length > 3 && <li>... and {notebooks.length - 3} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;