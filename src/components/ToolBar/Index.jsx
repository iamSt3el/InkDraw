import React from 'react';
import styles from './ToolBar.module.scss';
import Button from '../atoms/Button/Button';
import { Menu, Pen, Eraser, MoveLeft, Trash, Undo, X, Palette, Grid3X3, Settings } from 'lucide-react';
import { useDrawingStore } from '../../stores/drawingStore';
import { useUIStore } from '../../stores/uiStore';

const ToolBar = () => {
  // Get currentTool and setTool from the store
  const {
    currentTool,
    setTool,
    clearCanvas,
    undoCanvas
  } = useDrawingStore();

  const {
    toggleMenu,
    isMenuOpen,
    togglePagePanel,
    togglePenPanel,
    setMenuOpen,
    handleExportImage,
    handleExportSVG
  } = useUIStore();

  // Handle tool selection
  const handlePenClick = () => {
    setTool('pen');
  };

  const handleEraserClick = () => {
    setTool('eraser');
  };

  const handleClearClick = () => {
    if (clearCanvas) {
      clearCanvas();
    }
  };

  const handleUndoClick = () => {
    if (undoCanvas) {
      undoCanvas();
    }
  };

  return (
    <div className={styles.tb_cover}>
      <div className={styles.tb_menu}>
        <div className={`${styles.quick_menu} ${isMenuOpen ? styles.visible : ''}`}>
          <button
            className={styles.menu_toggle}
            onClick={toggleMenu}
            aria-label="Toggle quick menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {isMenuOpen && (
            <div className={styles.menu_content}>
              <button
                className={styles.menu_item}
                onClick={() => { togglePenPanel(); setMenuOpen(false); }}
              >
                <Palette size={18} />
                <span>Pen Settings</span>
              </button>
              <button
                className={styles.menu_item}
                onClick={() => { togglePagePanel(); setMenuOpen(false); }}
              >
                <Grid3X3 size={18} />
                <span>Page Settings</span>
              </button>
              <div className={styles.menu_divider} />
              <button
                className={styles.menu_item}
                onClick={() => { handleExportImage(); setMenuOpen(false); }}
              >
                <Settings size={18} />
                <span>Export PNG</span>
              </button>
              <button
                className={styles.menu_item}
                onClick={() => { handleExportSVG(); setMenuOpen(false); }}
              >
                <Settings size={18} />
                <span>Export SVG</span>
              </button>
            </div>
          )}
        </div>


      </div>

      <div className={styles.tb_tools}>
        <Button
          Icon={Pen}
          isActive={currentTool === 'pen'}
          onClick={handlePenClick}
        />
        <Button
          Icon={Eraser}
          isActive={currentTool === 'eraser'}
          onClick={handleEraserClick}
        />
        <Button
          Icon={Trash}
          onClick={handleClearClick}
        />
        <Button
          Icon={Undo}
          onClick={handleUndoClick}
        />
      </div>

      <div className={styles.tb_details}>
        <Button Icon={MoveLeft} />
      </div>
    </div>
  );
};

export default ToolBar;