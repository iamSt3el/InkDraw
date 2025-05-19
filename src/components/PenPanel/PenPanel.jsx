// src/components/PenPanel/PenPanel.jsx
import React from 'react';
import { useDrawingStore } from '../../stores/drawingStore';
import { useUIStore } from '../../stores/uiStore';
import { Pen, MinusCircle, PlusCircle, XCircle } from 'lucide-react';
import styles from './PenPanel.module.scss';

const PenPanel = () => {
  const {
    strokeColor,
    strokeWidth,
    opacity,
    sketchyMode,
    setStrokeColor,
    setStrokeWidth,
    setOpacity,
    setSketchyMode,
    setTool
  } = useDrawingStore();
  
  const { isPenPanelVisible, togglePenPanel } = useUIStore();
  
  if (!isPenPanelVisible) return null;
  
  // Predefined color palette
  const colorPalette = [
    '#000000', // Black
    '#2563EB', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
  ];
  
  // Handle color selection
  const handleColorSelect = (color) => {
    setStrokeColor(color);
    setTool('pen'); // Auto-switch to pen tool
  };
  
  // Handle stroke width change
  const handleStrokeWidthChange = (delta) => {
    const newWidth = Math.max(1, Math.min(50, strokeWidth + delta));
    setStrokeWidth(newWidth);
  };
  
  // Handle opacity change
  const handleOpacityChange = (delta) => {
    const newOpacity = Math.max(10, Math.min(100, opacity + delta));
    setOpacity(newOpacity);
  };
  
  return (
    <div className={styles.penPanel}>
      <div className={styles.panelHeader}>
        <h3>Pen Settings</h3>
        <button 
          className={styles.closeButton}
          onClick={togglePenPanel}
          aria-label="Close pen panel"
        >
          <XCircle size={20} />
        </button>
      </div>
      
      <div className={styles.colorPalette}>
        {colorPalette.map((color) => (
          <button
            key={color}
            className={`${styles.colorButton} ${strokeColor === color ? styles.selected : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => handleColorSelect(color)}
            aria-label={`Select ${color} color`}
          />
        ))}
      </div>
      
      <div className={styles.controlGroup}>
        <label>Stroke Width</label>
        <div className={styles.controlRow}>
          <button 
            onClick={() => handleStrokeWidthChange(-1)}
            className={styles.controlButton}
            aria-label="Decrease stroke width"
          >
            <MinusCircle size={20} />
          </button>
          <div className={styles.controlValue}>
            <div 
              className={styles.strokePreview} 
              style={{ height: `${Math.min(20, strokeWidth)}px` }}
            />
            <span>{strokeWidth}px</span>
          </div>
          <button 
            onClick={() => handleStrokeWidthChange(1)}
            className={styles.controlButton}
            aria-label="Increase stroke width"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </div>
      
      <div className={styles.controlGroup}>
        <label>Opacity</label>
        <div className={styles.controlRow}>
          <button 
            onClick={() => handleOpacityChange(-5)}
            className={styles.controlButton}
            aria-label="Decrease opacity"
          >
            <MinusCircle size={20} />
          </button>
          <div className={styles.controlValue}>
            <div 
              className={styles.opacityPreview} 
              style={{ opacity: opacity / 100 }}
            />
            <span>{opacity}%</span>
          </div>
          <button 
            onClick={() => handleOpacityChange(5)}
            className={styles.controlButton}
            aria-label="Increase opacity"
          >
            <PlusCircle size={20} />
          </button>
        </div>
      </div>
      
      <div className={styles.controlGroup}>
        <label>Style</label>
        <div className={styles.toggleRow}>
          <button
            className={`${styles.toggleButton} ${!sketchyMode ? styles.active : ''}`}
            onClick={() => setSketchyMode(false)}
            aria-label="Smooth pen style"
          >
            Smooth
          </button>
          <button
            className={`${styles.toggleButton} ${sketchyMode ? styles.active : ''}`}
            onClick={() => setSketchyMode(true)}
            aria-label="Sketchy pen style"
          >
            Sketchy
          </button>
        </div>
      </div>
    </div>
  );
};

export default PenPanel;