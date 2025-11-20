import React, { useState, useEffect } from 'react'
import styles from './PagePanel.module.scss'
import { useDrawingStore } from '../../stores/drawingStore';
import { useUIStore } from '../../stores/uiStore';
import { X } from 'lucide-react';

const PageSettingPanel = () => {
  const {
    pageSettings,
    setPattern,
    setPatternSize,
    setPatternColor,
    setPatternOpacity
  } = useDrawingStore();
  
  const { isPagePanelVisible, togglePagePanel } = useUIStore();
  
  
  const [currentPattern, setCurrentPattern] = useState(pageSettings.pattern);
  const [currentPatternSize, setCurrentPatternSize] = useState(pageSettings.patternSize);
  const [currentPatternColor, setCurrentPatternColor] = useState(pageSettings.patternColor);
  const [currentPatternOpacity, setCurrentPatternOpacity] = useState(pageSettings.patternOpacity);

  
  useEffect(() => {
    setCurrentPattern(pageSettings.pattern);
  }, [pageSettings.pattern]);

  useEffect(() => {
    setCurrentPatternSize(pageSettings.patternSize);
  }, [pageSettings.patternSize]);

  useEffect(() => {
    setCurrentPatternColor(pageSettings.patternColor);
  }, [pageSettings.patternColor]);

  useEffect(() => {
    setCurrentPatternOpacity(pageSettings.patternOpacity);
  }, [pageSettings.patternOpacity]);

  
  if (!isPagePanelVisible) return null;

  const patterns = [
    { 
      id: 'blank', 
      label: 'Blank',
      icon: '□',
      description: 'Plain white background'
    },
    { 
      id: 'grid', 
      label: 'Grid',
      icon: '⊞',
      description: 'Square grid pattern'
    },
    { 
      id: 'dots', 
      label: 'Dots',
      icon: '⋯',
      description: 'Dotted grid pattern'
    },
    { 
      id: 'lines', 
      label: 'Lines',
      icon: '≡',
      description: 'Horizontal lines'
    },
    { 
      id: 'graph', 
      label: 'Graph',
      icon: '▦',
      description: 'Graph paper style'
    }
  ];

  const patternColors = [
    '#e5e7eb', 
    '#d1d5db', 
    '#9ca3af', 
    '#ddd6fe', 
    '#c7d2fe', 
    '#d1fae5', 
    '#fef3c7', 
    '#fed7d7', 
  ];

  const handlePatternChange = (newPattern) => {
    setCurrentPattern(newPattern);
    setPattern(newPattern);
  };

  const handlePatternSizeChange = (newSize) => {
    setCurrentPatternSize(newSize);
    setPatternSize(newSize);
  };

  const handlePatternColorChange = (newColor) => {
    setCurrentPatternColor(newColor);
    setPatternColor(newColor);
  };

  const handlePatternOpacityChange = (e) => {
    const newOpacity = parseInt(e.target.value);
    setCurrentPatternOpacity(newOpacity);
    setPatternOpacity(newOpacity);
  };

  return (
    <div className={styles.pagesettingpanel}>
      <div className={styles.pagesettingpanel_cover}>
        <div className={styles.section_header}>
          <h3>Page Settings</h3>
          <button 
            className={styles.close_button}
            onClick={togglePagePanel}
            aria-label="Close page settings panel"
          >
            <X size={18} />
          </button>
        </div>

        {}
        <div className={styles.section}>
          <div className={styles.section_title}>Pattern Type</div>
          <div className={styles.pattern_grid}>
            {patterns.map((patternOption) => (
              <div
                key={patternOption.id}
                className={`${styles.pattern_option} ${currentPattern === patternOption.id ? styles.active : ''}`}
                onClick={() => handlePatternChange(patternOption.id)}
                title={patternOption.description}
              >
                <div className={styles.pattern_icon}>{patternOption.icon}</div>
                <div className={styles.pattern_label}>{patternOption.label}</div>
              </div>
            ))}
          </div>
        </div>

        {}
        {currentPattern !== 'blank' && (
          <div className={styles.section}>
            <div className={styles.section_title}>
              Pattern Size
              <span className={styles.value_display}>{currentPatternSize}px</span>
            </div>
            <div className={styles.size_cover}>
              <input
                type="range"
                min="10"
                max="50"
                value={currentPatternSize}
                onChange={(e) => handlePatternSizeChange(parseInt(e.target.value))}
                className={styles.size_slider}
              />
              <div className={styles.size_presets}>
                {[15, 20, 25, 30].map(size => (
                  <button
                    key={size}
                    className={`${styles.size_preset} ${currentPatternSize === size ? styles.active : ''}`}
                    onClick={() => handlePatternSizeChange(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {}
        {currentPattern !== 'blank' && (
          <div className={styles.section}>
            <div className={styles.section_title}>Pattern Color</div>
            <div className={styles.color_picker_cover}>
              <div className={styles.color_picker}>
                <div className={styles.color_grid}>
                  {patternColors.map((color) => (
                    <div
                      key={color}
                      className={`${styles.color_option} ${currentPatternColor === color ? styles.active : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handlePatternColorChange(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {}
        {currentPattern !== 'blank' && (
          <div className={styles.section}>
            <div className={styles.section_title}>
              Pattern Opacity
              <span className={styles.value_display}>{currentPatternOpacity}%</span>
            </div>
            <div className={styles.opacity_cover}>
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={currentPatternOpacity}
                onChange={handlePatternOpacityChange}
                className={styles.opacity_slider} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageSettingPanel;