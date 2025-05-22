// src/App.js - Updated App component with filesystem integration
import React from 'react';
import NoteBookManager from './pages/NoteBookManagerPage';
import NotebookInside from './pages/NotebookInside/Index';


function App() {
  return (
    <div>
      {<NoteBookManager/> }
      {/* <NotebookInside/> */}
    </div>
  );
}

export default App;