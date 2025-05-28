// src/components/ShapePanel/ShapePanel.jsx - Simplified
import React from 'react';
import styles from './ShapePanel.module.scss';
import { useDrawingStore } from '../../stores/drawingStore';
import { useUIStore } from '../../stores/uiStore';
import { X, Square } from 'lucide-react';

const ShapePanel = () => {
  const {
    shapeColor,
    shapeBorderSize,
    shapeFill,
    shapeFillColor,
    shapeRoundCorners,
    setShapeColor,
    setShapeBorderSize,
    setShapeFill,
    setShapeFillColor,
    setShapeRoundCorners,
    setTool,
    currentTool
  } = useDrawingStore();

  const { isShapePanelVisible, toggleShapePanel } = useUIStore();

  // Early return if panel is not visible
  if (!isShapePanelVisible) return null;

  const handleColorChange = (e) => {
    setShapeColor(e.target.value);
  };

  const handleFillColorChange = (e) => {
    setShapeFillColor(e.target.value);
  };

  const handleBorderSizeChange = (e) => {
    setShapeBorderSize(parseInt(e.target.value));
  };

  const handleFillToggle = (e) => {
    setShapeFill(e.target.checked);
  };

  const handleRoundCornersToggle = (e) => {
    setShapeRoundCorners(e.target.checked);
  };

  const handleRectangleClick = () => {
    setTool('rectangle');
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
            <button
              className={`${styles.shape_tool} ${currentTool === 'rectangle' ? styles.active : ''}`}
              onClick={handleRectangleClick}
              title="Rectangle Tool (Hand-drawn style)"
            >
              <Square size={20} />
              <span>Rectangle</span>
            </button>
          </div>
        </div>

        {/* Shape Color */}
        <div className={styles.section}>
          <div className={styles.section_title}>Shape Color</div>
          <div className={styles.color_control}>
            <div className={styles.color_input_wrapper}>
              <input
                type="color"
                value={shapeColor}
                onChange={handleColorChange}
                className={styles.color_input}
              />
              <span className={styles.color_value}>{shapeColor}</span>
            </div>
          </div>
        </div>

        {/* Border Size */}
        <div className={styles.section}>
          <div className={styles.section_title}>
            Border Size
            <span className={styles.value_display}>{shapeBorderSize}px</span>
          </div>
          <div className={styles.control_group}>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={shapeBorderSize}
              onChange={handleBorderSizeChange}
              className={styles.range_slider}
            />
            <div className={styles.range_markers}>
              <span>Thin</span>
              <span>Thick</span>
            </div>
          </div>
        </div>

        {/* Fill Options */}
        <div className={styles.section}>
          <div className={styles.section_title}>Fill</div>
          <div className={styles.fill_controls}>
            <label className={styles.checkbox_label}>
              <input
                type="checkbox"
                checked={shapeFill}
                onChange={handleFillToggle}
                className={styles.checkbox}
              />
              <span className={styles.checkbox_text}>Enable Fill</span>
            </label>

            {shapeFill && (
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
            )}
          </div>
        </div>

        {/* Round Corners */}
        <div className={styles.section}>
          <div className={styles.section_title}>Corner Style</div>
          <label className={styles.checkbox_label}>
            <input
              type="checkbox"
              checked={shapeRoundCorners}
              onChange={handleRoundCornersToggle}
              className={styles.checkbox}
            />
            <span className={styles.checkbox_text}>Round Corners</span>
          </label>
        </div>

        {/* Info Section */}
        <div className={styles.info_section}>
          <div className={styles.info_text}>
            <strong>Hand-drawn Style:</strong> All rectangles use a sketchy, hand-drawn appearance for a natural look.
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShapePanel;