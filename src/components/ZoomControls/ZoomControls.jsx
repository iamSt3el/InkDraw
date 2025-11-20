
import React from 'react';
import { ZoomIn, ZoomOut, Move, Maximize } from 'lucide-react';
import { useDrawingStore } from '../../stores/drawingStore';
import styles from './ZoomControls.module.scss';

const ZoomControls = () => {
  const { 
    zoomLevel, 
    zoomIn, 
    zoomOut, 
    resetZoom, 
    currentTool,
    setTool
  } = useDrawingStore();

  
  const zoomPercentage = Math.round(zoomLevel * 100);

  
  const handlePanToolToggle = () => {
    if (currentTool === 'pan') {
      
      setTool('pen');
    } else {
      setTool('pan');
    }
  };

  return (
    <div className={styles.zoomControls}>
      <button 
        className={styles.zoomButton} 
        onClick={zoomOut}
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <ZoomOut size={18} />
      </button>
      
      <div 
        className={styles.zoomLevel}
        title="Current Zoom Level"
      >
        {zoomPercentage}%
      </div>
      
      <button 
        className={styles.zoomButton} 
        onClick={zoomIn}
        title="Zoom In"
        aria-label="Zoom In"
      >
        <ZoomIn size={18} />
      </button>
      
      <button 
        className={`${styles.zoomButton} ${currentTool === 'pan' ? styles.active : ''}`} 
        onClick={handlePanToolToggle}
        title="Pan Tool"
        aria-label="Pan Tool"
      >
        <Move size={18} />
      </button>
      
      <button 
        className={styles.zoomButton} 
        onClick={resetZoom}
        title="Reset Zoom"
        aria-label="Reset Zoom"
      >
        <Maximize size={18} />
      </button>
    </div>
  );
};

export default ZoomControls;