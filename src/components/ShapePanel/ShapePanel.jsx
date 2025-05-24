// src/components/ShapePanel/ShapePanel.jsx
import React, { useState, useEffect } from 'react';
import styles from './ShapePanel.module.scss';
import { useDrawingStore } from '../../stores/drawingStore';
import { useUIStore } from '../../stores/uiStore';
import { X, Square, Circle, Triangle, Minus } from 'lucide-react';

const ShapePanel = () => {
  const {
    strokeColor,
    strokeWidth,
    opacity,
    isRoughMode,
    roughness,
    bowing,
    fillStyle,
    shapeFill,
    shapeFillColor,
    shapeFillOpacity,
    setRoughMode,
    setRoughness,
    setBowing,
    setFillStyle,
    setShapeFill,
    setShapeFillColor,
    setShapeFillOpacity,
    applyRoughPreset,
    setTool,
    currentTool
  } = useDrawingStore();

  const { isShapePanelVisible, toggleShapePanel } = useUIStore();

  // Early return if panel is not visible
  if (!isShapePanelVisible) return null;

  // Fill style options
  const fillStyles = [
    { value: 'hachure', label: 'Hachure', icon: '///' },
    { value: 'cross-hatch', label: 'Cross Hatch', icon: 'X' },
    { value: 'dots', label: 'Dots', icon: '···' },
    { value: 'dashed', label: 'Dashed', icon: '---' },
    { value: 'zigzag', label: 'Zigzag', icon: '~' },
    { value: 'solid', label: 'Solid', icon: '█' }
  ];

  // Rough style presets
  const roughPresets = [
    { name: 'smooth', label: 'Smooth', roughness: 0, bowing: 0 },
    { name: 'sketchy', label: 'Sketchy', roughness: 1.5, bowing: 1 },
    { name: 'rough', label: 'Rough', roughness: 2.5, bowing: 2 },
    { name: 'cartoon', label: 'Cartoon', roughness: 1, bowing: 3 },
    { name: 'architectural', label: 'Architectural', roughness: 0.5, bowing: 0 }
  ];

  // Shape tools
  const shapeTools = [
    { tool: 'rectangle', label: 'Rectangle', icon: Square },
    // Future shapes
    // { tool: 'circle', label: 'Circle', icon: Circle },
    // { tool: 'triangle', label: 'Triangle', icon: Triangle },
    // { tool: 'line', label: 'Line', icon: Minus }
  ];

  const handlePresetClick = (presetName) => {
    applyRoughPreset(presetName);
  };

  const handleFillColorChange = (e) => {
    setShapeFillColor(e.target.value);
  };

  return (
    <div className={styles.shapepanel}>
      <div className={styles.shapepanel_cover}>
        <div className={styles.section_header}>
          <h3>Shape Tools</h3>
          <button 
            className={styles.close_button}
            onClick={toggleShapePanel}
            aria-label="Close shape panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shape Tool Selection */}
        <div className={styles.section}>
          <div className={styles.section_title}>Shape Type</div>
          <div className={styles.shape_tools}>
            {shapeTools.map((shape) => {
              const IconComponent = shape.icon;
              return (
                <button
                  key={shape.tool}
                  className={`${styles.shape_tool} ${currentTool === shape.tool ? styles.active : ''}`}
                  onClick={() => setTool(shape.tool)}
                  title={shape.label}
                >
                  <IconComponent size={20} />
                  <span>{shape.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Style Toggle */}
        <div className={styles.section}>
          <div className={styles.section_title}>Drawing Style</div>
          <div className={styles.style_toggle}>
            <button 
              className={`${styles.style_button} ${!isRoughMode ? styles.active : ''}`}
              onClick={() => setRoughMode(false)}
            >
              <div className={styles.style_preview_clean}></div>
              Clean
            </button>
            <button 
              className={`${styles.style_button} ${isRoughMode ? styles.active : ''}`}
              onClick={() => setRoughMode(true)}
            >
              <div className={styles.style_preview_rough}></div>
              Hand-drawn
            </button>
          </div>
        </div>

        {/* Rough Style Presets */}
        {isRoughMode && (
          <div className={styles.section}>
            <div className={styles.section_title}>Style Presets</div>
            <div className={styles.preset_grid}>
              {roughPresets.map((preset) => (
                <button
                  key={preset.name}
                  className={`${styles.preset_button} ${
                    roughness === preset.roughness && bowing === preset.bowing ? styles.active : ''
                  }`}
                  onClick={() => handlePresetClick(preset.name)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Rough Controls */}
        {isRoughMode && (
          <>
            <div className={styles.section}>
              <div className={styles.section_title}>
                Roughness
                <span className={styles.value_display}>{roughness.toFixed(1)}</span>
              </div>
              <div className={styles.control_group}>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={roughness}
                  onChange={(e) => setRoughness(parseFloat(e.target.value))}
                  className={styles.range_slider}
                />
                <div className={styles.range_markers}>
                  <span>Smooth</span>
                  <span>Rough</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.section_title}>
                Bowing
                <span className={styles.value_display}>{bowing.toFixed(1)}</span>
              </div>
              <div className={styles.control_group}>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={bowing}
                  onChange={(e) => setBowing(parseFloat(e.target.value))}
                  className={styles.range_slider}
                />
                <div className={styles.range_markers}>
                  <span>Straight</span>
                  <span>Curved</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Fill Options */}
        <div className={styles.section}>
          <div className={styles.section_title}>Fill</div>
          <div className={styles.fill_controls}>
            <label className={styles.checkbox_label}>
              <input
                type="checkbox"
                checked={shapeFill}
                onChange={(e) => setShapeFill(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkbox_text}>Enable Fill</span>
            </label>

            {shapeFill && (
              <>
                <div className={styles.color_control}>
                  <label className={styles.color_label}>Fill Color</label>
                  <div className={styles.color_input_wrapper}>
                    <input
                      type="color"
                      value={shapeFillColor}
                      onChange={handleFillColorChange}
                      className={styles.color_input}
                    />
                    <span className={styles.color_value}>{shapeFillColor}</span>
                  </div>
                </div>

                <div className={styles.opacity_control}>
                  <label className={styles.opacity_label}>
                    Fill Opacity
                    <span className={styles.value_display}>{shapeFillOpacity}%</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={shapeFillOpacity}
                    onChange={(e) => setShapeFillOpacity(parseInt(e.target.value))}
                    className={styles.range_slider}
                  />
                </div>

                {isRoughMode && (
                  <div className={styles.fill_style_control}>
                    <label className={styles.fill_style_label}>Fill Style</label>
                    <div className={styles.fill_styles}>
                      {fillStyles.map((style) => (
                        <button
                          key={style.value}
                          className={`${styles.fill_style_button} ${fillStyle === style.value ? styles.active : ''}`}
                          onClick={() => setFillStyle(style.value)}
                          title={style.label}
                        >
                          <span className={styles.fill_icon}>{style.icon}</span>
                          <span className={styles.fill_label}>{style.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShapePanel;