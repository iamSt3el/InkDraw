
import React, { useState, useEffect } from 'react';
import styles from './AiTextPanel.module.scss';
import { useDrawingStore } from '../../stores/drawingStore';
import { useUIStore } from '../../stores/uiStore';
import { X, Brain, Loader } from 'lucide-react';

const AiTextPanel = () => {
  const {
    aiTextSettings,
    isAiProcessing,
    strokeColor,
    setAiFontFamily,
    setAiFontSize,
    setAiFontWeight,
    setAiTextColor,
    setAiTextAlign
  } = useDrawingStore();

  const { isAiTextPanelVisible, toggleAiTextPanel } = useUIStore();

  
  const [currentFontFamily, setCurrentFontFamily] = useState(aiTextSettings.fontFamily);
  const [currentFontSize, setCurrentFontSize] = useState(aiTextSettings.fontSize);
  const [currentFontWeight, setCurrentFontWeight] = useState(aiTextSettings.fontWeight);
  const [currentTextColor, setCurrentTextColor] = useState(aiTextSettings.textColor);
  const [currentTextAlign, setCurrentTextAlign] = useState(aiTextSettings.textAlign);

  
  useEffect(() => {
    setCurrentFontFamily(aiTextSettings.fontFamily);
    setCurrentFontSize(aiTextSettings.fontSize);
    setCurrentFontWeight(aiTextSettings.fontWeight);
    setCurrentTextColor(aiTextSettings.textColor);
    setCurrentTextAlign(aiTextSettings.textAlign);
  }, [aiTextSettings]);

  
  if (!isAiTextPanelVisible) return null;

  
  const fontFamilies = [
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman', value: 'Times New Roman, Times, serif' },
    { label: 'Courier New', value: 'Courier New, Courier, monospace' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
    { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS, Helvetica, sans-serif' }
  ];

  
  const fontWeights = [
    { label: 'Normal', value: 'normal' },
    { label: 'Bold', value: 'bold' },
    { label: 'Light', value: '300' },
    { label: 'Medium', value: '500' },
    { label: 'Semi-Bold', value: '600' },
    { label: 'Extra Bold', value: '800' }
  ];

  
  const textAlignments = [
    { label: 'Left', value: 'left', icon: '⬅️' },
    { label: 'Center', value: 'center', icon: '↔️' },
    { label: 'Right', value: 'right', icon: '➡️' }
  ];

  
  const handleFontFamilyChange = (family) => {
    setCurrentFontFamily(family);
    setAiFontFamily(family);
  };

  const handleFontSizeChange = (e) => {
    const size = parseInt(e.target.value);
    setCurrentFontSize(size);
    setAiFontSize(size);
  };

  const handleFontWeightChange = (weight) => {
    setCurrentFontWeight(weight);
    setAiFontWeight(weight);
  };

  const handleTextColorChange = (e) => {
    const color = e.target.value;
    setCurrentTextColor(color);
    setAiTextColor(color);
  };

  const handleTextAlignChange = (align) => {
    setCurrentTextAlign(align);
    setAiTextAlign(align);
  };

  const handleUseStrokeColor = () => {
    setCurrentTextColor(null);
    setAiTextColor(null);
  };

  
  const effectiveTextColor = currentTextColor || strokeColor;

  return (
    <div className={styles.aitextpanel}>
      <div className={styles.aitextpanel_cover}>
        <div className={styles.section_header}>
          <h3>
            <Brain size={18} />
            AI Text Settings
          </h3>
          <button 
            className={styles.close_button}
            onClick={toggleAiTextPanel}
            aria-label="Close AI text settings panel"
          >
            <X size={18} />
          </button>
        </div>

        {}
        {isAiProcessing && (
          <div className={styles.processing_status}>
            <Loader className={styles.spinner} size={16} />
            <span>Converting handwriting...</span>
          </div>
        )}

        {}
        <div className={styles.section}>
          <div className={styles.section_title}>Font Family</div>
          <div className={styles.font_family_grid}>
            {fontFamilies.map((font) => (
              <button
                key={font.value}
                className={`${styles.font_option} ${currentFontFamily === font.value ? styles.active : ''}`}
                onClick={() => handleFontFamilyChange(font.value)}
                style={{ fontFamily: font.value }}
              >
                {font.label}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className={styles.section}>
          <div className={styles.section_title}>
            Font Size
            <span className={styles.value_display}>{currentFontSize}px</span>
          </div>
          <div className={styles.size_controls}>
            <input
              type="range"
              min="8"
              max="72"
              step="1"
              value={currentFontSize}
              onChange={handleFontSizeChange}
              className={styles.size_slider}
            />
            <div className={styles.size_presets}>
              {[12, 16, 20, 24, 32].map(size => (
                <button
                  key={size}
                  className={`${styles.size_preset} ${currentFontSize === size ? styles.active : ''}`}
                  onClick={() => {
                    setCurrentFontSize(size);
                    setAiFontSize(size);
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {}
        <div className={styles.section}>
          <div className={styles.section_title}>Font Weight</div>
          <div className={styles.weight_grid}>
            {fontWeights.map((weight) => (
              <button
                key={weight.value}
                className={`${styles.weight_option} ${currentFontWeight === weight.value ? styles.active : ''}`}
                onClick={() => handleFontWeightChange(weight.value)}
                style={{ fontWeight: weight.value }}
              >
                {weight.label}
              </button>
            ))}
          </div>
        </div>

        {}
        <div className={styles.section}>
          <div className={styles.section_title}>Text Color</div>
          <div className={styles.color_controls}>
            <div className={styles.color_option_row}>
              <button
                className={`${styles.stroke_color_btn} ${currentTextColor === null ? styles.active : ''}`}
                onClick={handleUseStrokeColor}
              >
                <div 
                  className={styles.color_preview}
                  style={{ backgroundColor: strokeColor }}
                />
                <span>Use Stroke Color</span>
              </button>
            </div>
            
            <div className={styles.color_option_row}>
              <input
                type="color"
                value={effectiveTextColor}
                onChange={handleTextColorChange}
                className={styles.color_input}
              />
              <span className={styles.color_value}>{effectiveTextColor}</span>
            </div>
          </div>
        </div>

        {}
        <div className={styles.section}>
          <div className={styles.section_title}>Text Alignment</div>
          <div className={styles.alignment_grid}>
            {textAlignments.map((align) => (
              <button
                key={align.value}
                className={`${styles.align_option} ${currentTextAlign === align.value ? styles.active : ''}`}
                onClick={() => handleTextAlignChange(align.value)}
                title={align.label}
              >
                <span className={styles.align_icon}>{align.icon}</span>
                <span className={styles.align_label}>{align.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiTextPanel;