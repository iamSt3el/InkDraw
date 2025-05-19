// src/components/NotebookUi/Index.jsx
import React from 'react';
import styles from './NotebookUi.module.scss';
import SmoothCanvas from '../SmoothCanvas/SmoothCanvas';
import { useDrawingStore } from '../../stores/drawingStore';

const NoteBookUi = () => {
  const numberOfHoles = 27;
  
  // Get page settings from the store
  const { pageSettings } = useDrawingStore();
  
  // Get background pattern style based on settings
  const getBackgroundPattern = () => {
    if (!pageSettings) return {};
    
    const { pattern, patternSize, patternColor, patternOpacity } = pageSettings;
    
    switch (pattern) {
      case 'grid':
        return {
          backgroundImage: `linear-gradient(to right, ${patternColor} 1px, transparent 1px),
                           linear-gradient(to bottom, ${patternColor} 1px, transparent 1px)`,
          backgroundSize: `${patternSize}px ${patternSize}px`,
          opacity: patternOpacity / 100
        };
      case 'ruled':
        return {
          backgroundImage: `linear-gradient(to bottom, ${patternColor} 1px, transparent 1px)`,
          backgroundSize: `${patternSize}px ${patternSize}px`,
          opacity: patternOpacity / 100
        };
      case 'dots':
        return {
          backgroundImage: `radial-gradient(circle, ${patternColor} 1px, transparent 1px)`,
          backgroundSize: `${patternSize}px ${patternSize}px`,
          backgroundPosition: `${patternSize/2}px ${patternSize/2}px`,
          opacity: patternOpacity / 100
        };
      default:
        return {
          backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                           linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
          backgroundSize: `20px 20px`,
          opacity: 0.5
        };
    }
  };

  return (
    <div className={styles.notebookui_cover}>
      {/* Separate background layer for the pattern */}
      <div 
        className={styles.pattern_background}
        style={getBackgroundPattern()}
      ></div>
      
      <div className={styles.notebookui_holes_div}>
        {Array.from({ length: numberOfHoles }).map((_, index) => (
          <div key={index} className={styles.notebookui_holes}></div>
        ))}
      </div>
      
      <div className={styles.notebookui_canvas}>
        <SmoothCanvas />
      </div>
    </div>
  );
};

export default NoteBookUi;