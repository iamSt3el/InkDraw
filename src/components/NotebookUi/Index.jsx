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
    
    // Calculate dot size based on pattern size to maintain visibility
    const getDotSize = (size) => {
      // Adjust dot size proportionally to pattern size
      // but keep it visible even for large grid sizes
      return Math.max(2, Math.min(4, Math.floor(size / 10)));
    };
    
    const dotSize = getDotSize(patternSize);
    
    switch (pattern) {
      case 'grid':
        return {
          backgroundImage: `linear-gradient(to right, ${patternColor} 1px, transparent 1px),
                           linear-gradient(to bottom, ${patternColor} 1px, transparent 1px)`,
          backgroundSize: `${patternSize}px ${patternSize}px`,
          opacity: patternOpacity / 100
        };
      case 'lines':
        return {
          backgroundImage: `linear-gradient(to bottom, ${patternColor} 1px, transparent 1px)`,
          backgroundSize: `${patternSize}px ${patternSize}px`,
          opacity: patternOpacity / 100
        };
      case 'dots':
        return {
          backgroundImage: `radial-gradient(circle, ${patternColor} ${dotSize}px, transparent ${dotSize}px)`,
          backgroundSize: `${patternSize}px ${patternSize}px`,
          backgroundPosition: `${patternSize/2}px ${patternSize/2}px`,
          opacity: patternOpacity / 100
        };
      case 'graph':
        return {
          backgroundImage: `linear-gradient(to right, ${patternColor} 1px, transparent 1px),
                           linear-gradient(to bottom, ${patternColor} 1px, transparent 1px)`,
          backgroundSize: `${patternSize}px ${patternSize}px`,
          backgroundPosition: '0 0',
          backgroundImage: `
            linear-gradient(to right, ${patternColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${patternColor} 1px, transparent 1px),
            linear-gradient(to right, rgba(${hexToRgb(patternColor)}, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(${hexToRgb(patternColor)}, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: `${patternSize}px ${patternSize}px, ${patternSize}px ${patternSize}px, ${patternSize/5}px ${patternSize/5}px, ${patternSize/5}px ${patternSize/5}px`,
          opacity: patternOpacity / 100
        };
      case 'blank':
      default:
        return {
          background: 'none',
          opacity: 1
        };
    }
  };

  // Helper function to convert hex to rgb
  const hexToRgb = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
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