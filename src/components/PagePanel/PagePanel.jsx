// src/components/PagePanel/PagePanel.jsx
import React from 'react';
import { useDrawingStore } from '../../stores/drawingStore';
import { useUIStore } from '../../stores/uiStore';
import { MinusCircle, PlusCircle, XCircle, Grid, Grip, Circle } from 'lucide-react';
import styles from './PagePanel.module.scss';

const PagePanel = () => {
  const {
    pageSettings,
    setPattern,
    setPatternSize,
    setPatternColor,
    setPatternOpacity
  } = useDrawingStore();
  
  const { isPagePanelVisible, togglePagePanel } = useUIStore();
  
  if (!isPagePanelVisible) return null;
  
  // Handle pattern size change
  const handlePatternSizeChange = (delta) => {
    const newSize = Math.max(5, Math.min(50, pageSettings.patternSize + delta));
    setPatternSize(newSize);
  };
  
  // Handle pattern opacity change
  const handleOpacityChange = (delta) => {
    const newOpacity = Math.max(0, Math.min(100, pageSettings.patternOpacity + delta));
    setPatternOpacity(newOpacity);
  };
  
  const patternTypes = [
    { id: 'grid', name: 'Grid', icon: Grid },
    { id: 'ruled', name: 'Ruled', icon: Grip },
    { id: 'dots', name: 'Dots', icon: Circle }
  ];
  
  const colorPalette = [
    '#e5e7eb', // Default light gray
    '#d1d5db', // Darker gray
    '#9ca3af', // Medium gray
    '#6b7280', // Dark gray
    '#93c5fd', // Light blue
    '#bfdbfe', // Very light blue
    '#fecaca', // Light red
    '#bbf7d0'  // Light green
  ];
  
  return (
    <div className={styles.pagePanel}>
      <div className={styles.panelHeader}>
        <h3>Page Settings</h3>
        <button 
          className={styles.closeButton}
          onClick={togglePagePanel}
          aria-label="Close page panel"
        >
          <XCircle size={20} />
        </button>
      </div>
      
      <div className={styles.patternSelector}>
        <label>Pattern Type</label>
        <div className={styles.patternTypeRow}>
          {patternTypes.map((pattern) => {
            const Icon = pattern.icon;
            return (
              <button
                key={pattern.id}
                className={`${styles.patternButton} ${pageSettings.pattern === pattern.id ? styles.active : ''}`}
                onClick={() => setPattern(pattern.id)}
                aria-label={`Select ${pattern.name} pattern`}
              >
                <Icon size={24} />
                <span>{pattern.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className={styles.controlGroup}>
        <label>Pattern Size</label>
        <div className={styles.controlRow}>
          <button 
            onClick={() => handlePatternSizeChange(-5)}
            className={styles.controlButton}
            aria-label="Decrease pattern size"
          >
            <MinusCircle size={20} />
          </button>
          <div className={styles.controlValue}>
            <div 
              className={styles.patternSizePreview} 
              style={{ 
                backgroundImage: `linear-gradient(to right, ${pageSettings.patternColor} 1px, transparent 1px),
                                 linear-gradient(to bottom, ${pageSettings.patternColor} 1px, transparent 1px)`,
                backgroundSize: `${pageSettings.patternSize}px ${pageSettings.patternSize}px`
              }}
            />
            <span>{pageSettings.patternSize}px</span>
          </div>
          <button 
            onClick={() => handlePatternSizeChange(5)}
            className={styles.controlButton}
            aria-label="Increase pattern size"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </div>
      
      <div className={styles.controlGroup}>
        <label>Pattern Color</label>
        <div className={styles.colorPalette}>
          {colorPalette.map((color) => (
            <button
              key={color}
              className={`${styles.colorButton} ${pageSettings.patternColor === color ? styles.selected : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setPatternColor(color)}
              aria-label={`Select ${color} for pattern`}
            />
          ))}
        </div>
      </div>
      
      <div className={styles.controlGroup}>
        <label>Pattern Opacity</label>
        <div className={styles.controlRow}>
          <button 
            onClick={() => handleOpacityChange(-5)}
            className={styles.controlButton}
            aria-label="Decrease pattern opacity"
          >
            <MinusCircle size={20} />
          </button>
          <div className={styles.controlValue}>
            <div 
              className={styles.opacityPreview} 
              style={{ 
                backgroundImage: `linear-gradient(to right, ${pageSettings.patternColor} 1px, transparent 1px),
                                 linear-gradient(to bottom, ${pageSettings.patternColor} 1px, transparent 1px)`,
                backgroundSize: `${pageSettings.patternSize}px ${pageSettings.patternSize}px`,
                opacity: pageSettings.patternOpacity / 100
              }}
            />
            <span>{pageSettings.patternOpacity}%</span>
          </div>
          <button 
            onClick={() => handleOpacityChange(5)}
            className={styles.controlButton}
            aria-label="Increase pattern opacity"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PagePanel;