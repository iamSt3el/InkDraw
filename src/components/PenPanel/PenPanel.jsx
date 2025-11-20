import React, { useState, useEffect } from 'react'
import styles from './PenPanel.module.scss'
import { useDrawingStore } from '../../stores/drawingStore';
import { useUIStore } from '../../stores/uiStore';
import { X } from 'lucide-react';

const PenSettingPanel = () => {
  const {
    strokeColor,
    strokeWidth,
    opacity,
    setStrokeColor,
    setStrokeWidth,
    setOpacity,
    setTool
  } = useDrawingStore();
  
  const { isPenPanelVisible, togglePenPanel } = useUIStore();
  
  
  const [currentColor, setCurrentColor] = useState(strokeColor);
  const [currentSize, setCurrentSize] = useState(strokeWidth);
  const [currentOpacity, setCurrentOpacity] = useState(opacity);

  
  useEffect(() => {
    setCurrentColor(strokeColor);
  }, [strokeColor]);

  useEffect(() => {
    setCurrentSize(strokeWidth);
  }, [strokeWidth]);

  useEffect(() => {
    setCurrentOpacity(opacity);
  }, [opacity]);
  
  
  if (!isPenPanelVisible) return null;
  
  const colors = [
    '#000000', 
    '#dc2626', 
    '#2563eb', 
    '#16a34a', 
    '#ca8a04', 
    '#7c3aed', 
    '#ea580c', 
    '#0891b2', 
    '#6b7280', 
    '#be185d', 
    '#059669', 
    '#7c2d12', 
  ];

  const handleColorClick = (color) => {
    setCurrentColor(color);
    setStrokeColor(color);
    setTool('pen'); 
  };

  const handleStrokeWidthChange = (width) => {
    setCurrentSize(width);
    setStrokeWidth(width);
  };

  const handleOpacityChange = (e) => {
    const newOpacity = parseInt(e.target.value);
    setCurrentOpacity(newOpacity);
    setOpacity(newOpacity);
  };

  
  const getColorWithOpacity = (hexColor, opacity) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  return (
    <div className={styles.pensettingpanel}>
      <div className={styles.pensettingpanel_cover}>
        <div className={styles.section_header}>
          <h3>Pen Settings</h3>
          <button 
            className={styles.close_button}
            onClick={togglePenPanel}
            aria-label="Close pen settings panel"
          >
            <X size={18} />
          </button>
        </div>

        {}
        <div className={styles.section}>
          <div className={styles.section_title}>Color</div>
          <div className={styles.color_picker_cover}>
            <div className={styles.color_picker}>
              <div className={styles.color_grid}>
                {colors.map((color) => (
                  <div
                    key={color}
                    className={`${styles.color_option} ${currentColor === color ? styles.active : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorClick(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {}
        <div className={styles.section}>
          <div className={styles.section_title}>
            Opacity
            <span className={styles.value_display}>{currentOpacity}%</span>
          </div>
          <div className={styles.opacity_cover}>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={currentOpacity}
              onChange={handleOpacityChange}
              className={styles.opacity_slider} 
            />
            {}
            <div className={styles.opacity_preview}>
              <div 
                className={styles.opacity_sample}
                style={{ 
                  backgroundColor: getColorWithOpacity(currentColor, currentOpacity)
                }}
              />
            </div>
          </div>
        </div>

        {}
        <div className={styles.section}>
          <div className={styles.section_title}>
            Size
            <span className={styles.value_display}>{currentSize}px</span>
          </div>
          <div className={styles.size_cover}>
            <button 
              className={`${styles.size_button} ${currentSize === 2 ? styles.active : ''}`} 
              onClick={() => handleStrokeWidthChange(2)}
            >
              <div className={styles.size_preview} style={{ width: '2px', height: '2px' }} />
              <span>S</span>
            </button>
            <button 
              className={`${styles.size_button} ${currentSize === 5 ? styles.active : ''}`} 
              onClick={() => handleStrokeWidthChange(5)}
            >
              <div className={styles.size_preview} style={{ width: '5px', height: '5px' }} />
              <span>M</span>
            </button>
            <button 
              className={`${styles.size_button} ${currentSize === 8 ? styles.active : ''}`} 
              onClick={() => handleStrokeWidthChange(8)}
            >
              <div className={styles.size_preview} style={{ width: '8px', height: '8px' }} />
              <span>L</span>
            </button>
            <button 
              className={`${styles.size_button} ${currentSize === 10 ? styles.active : ''}`} 
              onClick={() => handleStrokeWidthChange(10)}
            >
              <div className={styles.size_preview} style={{ width: '10px', height: '10px' }} />
              <span>XL</span>
            </button>
          </div>
          
          {}
          <div className={styles.custom_size}>
            <input
              type="range"
              min="1"
              max="20"
              value={currentSize}
              onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
              className={styles.size_slider}
            />
          </div>
        </div>

        {}
        <div className={styles.section}>
          <div className={styles.section_title}>Preview</div>
          <div className={styles.live_preview}>
            <svg width="160" height="60" viewBox="0 0 160 60">
              <path
                d="M 10 30 Q 50 10 80 30 Q 110 50 150 30"
                stroke={getColorWithOpacity(currentColor, currentOpacity)}
                strokeWidth={currentSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PenSettingPanel;