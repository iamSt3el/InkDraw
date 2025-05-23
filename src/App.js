// src/App.js - Updated with Notification component
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NoteBookManager from './pages/NoteBookManagerPage';
import NotebookInside from './pages/NotebookInside/Index';
import Notification from './components/Notification/Notification'; // NEW IMPORT
import { useNotebookStore } from './stores/noteBookStore';
import { usePageStore } from './stores/pageStore';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [showDebug, setShowDebug] = useState(false); // Changed to false by default
  
  // Get initialization methods from stores
  const initializeNotebooks = useNotebookStore(state => state.initialize);
  const initializePages = usePageStore(state => state.initialize);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing Drawo application...');
        
        // Initialize stores
        await Promise.all([
          initializeNotebooks(),
          initializePages()
        ]);
        
        console.log('Application initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize application:', error);
        setInitError(error.message);
        // Still allow app to load even if initialization fails
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [initializeNotebooks, initializePages]);

  // Toggle debug panel with Ctrl+D
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setShowDebug(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #f3f4f6',
          borderTop: '3px solid #8b5cf6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <h2 style={{ color: '#374151', margin: '0' }}>Loading Drawo...</h2>
        {initError && (
          <p style={{ color: '#ef4444', marginTop: '10px', fontSize: '14px' }}>
            Warning: {initError}
          </p>
        )}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default route - Notebook Manager */}
          <Route path="/" element={<NoteBookManager />} />
          
          {/* Notebook Manager route */}
          <Route path="/notebooks" element={<NoteBookManager />} />
          
          {/* Notebook Inside route with notebook ID parameter */}
          <Route path="/notebook/:notebookId" element={<NotebookInside />} />
          
          {/* Notebook Inside route with notebook ID and page number */}
          <Route path="/notebook/:notebookId/page/:pageNumber" element={<NotebookInside />} />
          
          {/* Fallback route - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Global Notification Component - NEW */}
        <Notification />
        
        {/* Debug Panel - Only show if enabled */}
        {showDebug && (
          <div style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            background: 'white',
            border: '2px solid #8b5cf6',
            borderRadius: '8px',
            padding: '1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 9999,
            fontSize: '12px',
            maxWidth: '300px'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#8b5cf6' }}>Debug Panel (Ctrl+D to toggle)</h4>
            <div>Press Ctrl+D to hide this panel</div>
            {initError && (
              <div style={{ color: 'red', marginTop: '0.5rem' }}>
                Init Error: {initError}
              </div>
            )}
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;