// src/components/ToolBar/Index.jsx - Updated with Shape Panel Integration
import React from 'react';
import styles from './ToolBar.module.scss';
import Button from '../atoms/Button/Button';
import PageNavigator from '../PageNavigator/PageNavigator';
import { 
  Menu, Pen, Eraser, MoveLeft, Trash, Undo, X, Palette, Grid3X3, 
  Settings, ZoomIn, ZoomOut, RotateCcw, Move, Square, ArrowLeft, Save, Shapes 
} from 'lucide-react';
import { useDrawingStore } from '../../stores/drawingStore';
import { useUIStore } from '../../stores/uiStore';
import { usePageStore } from '../../stores/pageStore';

const ToolBar = ({ 
  // Navigation props
  notebookInfo = null,
  currentPage = null,
  totalPages = null,
  onPageChange = null,
  onPreviousPage = null,
  onNextPage = null,
  onBackToNotebooks = null,
  onSave = null,
  isSaving = false,
  isTransitioning = false
}) => {
  // Get currentTool and setTool from the store
  const {
    currentTool,
    setTool,
    clearCanvas,
    undoCanvas,
    zoomLevel,
    isRoughMode
  } = useDrawingStore();

  const {
    toggleMenu,
    isMenuOpen,
    togglePagePanel,
    togglePenPanel,
    toggleShapePanel,  // Add shape panel toggle
    setMenuOpen,
    handleExportImage,
    handleExportSVG
  } = useUIStore();

  const { isSaving: storeSaving } = usePageStore();

  // Handle tool selection
  const handlePenClick = () => {
    setTool('pen');
  };

  const handleEraserClick = () => {
    setTool('eraser');
  };

  const handleShapeClick = () => {
    setTool('rectangle');
  }

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

  const handleSaveClick = () => {
    if (onSave) {
      onSave();
    }
  };

  const actualIsSaving = isSaving || storeSaving;

  return (
    <>
      {/* TOP TOOLBAR - FIXED ORDER */}
      <div className={styles.tb_cover}>
        {/* LEFT SECTION: Notebook Info */}
        <div className={styles.tb_left}>
          {/* Back Button */}
          {onBackToNotebooks && (
            <button 
              className={styles.backButton}
              onClick={onBackToNotebooks}
              title="Back to Notebooks"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
          )}

          {/* Notebook Info */}
          {notebookInfo && (
            <div className={styles.notebookInfo}>
              <h3 className={styles.notebookTitle}>{notebookInfo.title}</h3>
              {notebookInfo.description && (
                <span className={styles.notebookDescription}>
                  {notebookInfo.description}
                </span>
              )}
            </div>
          )}
        </div>

        {/* CENTER SECTION: Drawing Tools */}
        <div className={styles.tb_center}>
          <div className={styles.drawing_tools}>
            <Button
              Icon={Pen}
              isActive={currentTool === 'pen'}
              onClick={handlePenClick}
              label="Pen Tool"
            />
            <Button
              Icon={Eraser}
              isActive={currentTool === 'eraser'}
              onClick={handleEraserClick}
              label="Eraser Tool"
            />
            <div className={styles.shape_tool_container}>
              <Button
                Icon={Square}
                isActive={currentTool === 'rectangle'}
                onClick={handleShapeClick}
                label={`Rectangle Tool ${isRoughMode ? '(Rough)' : '(Clean)'}`}
              />
            </div>
            <Button
              Icon={Trash}
              onClick={handleClearClick}
              label="Clear Canvas"
            />
            <Button
              Icon={Undo}
              onClick={handleUndoClick}
              label="Undo"
            />
          </div>
        </div>

        {/* RIGHT SECTION: Navigation & Menu */}
        <div className={styles.tb_right}>
          {/* Page Navigator */}
          {currentPage && totalPages && (
            <div className={styles.pageNavigatorWrapper}>
              <PageNavigator
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                onPreviousPage={onPreviousPage}
                onNextPage={onNextPage}
              />
            </div>
          )}

          {/* Save Status */}
          <div className={styles.saveStatus}>
            {isTransitioning && (
              <span className={styles.switching}>
                <div className={styles.miniSpinner}></div>
                Switching...
              </span>
            )}
            {actualIsSaving && !isTransitioning && (
              <span className={styles.saving}>
                <div className={styles.miniSpinner}></div>
                Saving...
              </span>
            )}
            {!actualIsSaving && !isTransitioning && (
              <span className={styles.ready}>Ready</span>
            )}
          </div>

          {/* Save Button */}
          {onSave && (
            <button 
              className={styles.saveButton}
              onClick={handleSaveClick}
              disabled={actualIsSaving || isTransitioning}
              title="Save Page (Ctrl+S)"
            >
              <Save size={16} />
              <span>Save</span>
            </button>
          )}

          {/* Menu */}
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
                    onClick={() => { toggleShapePanel(); setMenuOpen(false); }}
                  >
                    <Shapes size={18} />
                    <span>Shape Settings</span>
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
        </div>
      </div>

      {/* BOTTOM ZOOM CONTROLS */}
      <div className={styles.zoom_toolbar}>
        <div className={styles.zoom_controls}>
          <span className={styles.zoom_label}>Zoom:</span>
          <div className={styles.zoom_buttons}>
            <button 
              className={styles.zoom_button}
              onClick={() => {
                const { zoomOut } = useDrawingStore.getState();
                zoomOut();
              }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            
            <div className={styles.zoom_level}>
              {Math.round(zoomLevel * 100)}%
            </div>
            
            <button 
              className={styles.zoom_button}
              onClick={() => {
                const { zoomIn } = useDrawingStore.getState();
                zoomIn();
              }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            
            <button 
              className={styles.zoom_button}
              onClick={() => {
                const { setTool } = useDrawingStore.getState();
                setTool(currentTool === 'pan' ? 'pen' : 'pan');
              }}
              title="Pan Tool"
              data-active={currentTool === 'pan'}
            >
              <Move size={16} />
            </button>
            
            <button 
              className={styles.zoom_button}
              onClick={() => {
                const { resetZoom } = useDrawingStore.getState();
                resetZoom();
              }}
              title="Reset Zoom"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ToolBar;