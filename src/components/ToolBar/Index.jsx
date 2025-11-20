
import React from 'react';
import styles from './ToolBar.module.scss';
import Button from '../atoms/Button/Button';
import PageNavigator from '../PageNavigator/PageNavigator';
import {
  Menu, Pen, Eraser, MoveLeft, Trash, Undo, X, Palette, Grid3X3,
  Settings, Square, ArrowLeft, Save,
  Shapes, MousePointer2, Brain, ImageIcon 
} from 'lucide-react';
import { useDrawingStore } from '../../stores/drawingStore';
import { useUIStore } from '../../stores/uiStore';
import { usePageStore } from '../../stores/pageStore';

const ToolBar = ({ 
  
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
  
  const {
    currentTool,
    setTool,
    clearCanvas,
    undoCanvas,
    isRoughMode,
    selectedItems,
    deleteSelection,
    isAiProcessing 
  } = useDrawingStore();

  const {
    toggleMenu,
    isMenuOpen,
    togglePagePanel,
    togglePenPanel,
    toggleShapePanel,
    toggleAiTextPanel, 
    setMenuOpen,
    handleExportImage,
    handleExportSVG,
    showNotification
  } = useUIStore();

  const { isSaving: storeSaving } = usePageStore();

  
  const handlePenClick = () => {
    setTool('pen');
  };

  const handleEraserClick = () => {
    setTool('eraser');
  };

  const handleShapeClick = () => {
    setTool('rectangle');
  };

  const handleSelectClick = () => {
    setTool('select');
  };

  
  const handleAiHandwritingClick = () => {
    setTool('aiHandwriting');
  };

  
  const handleImageClick = () => {
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        handleImageUpload(file);
      }
    };
    input.click();
  };

  const handleImageUpload = async (file) => {
    try {
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        
        
        const img = new Image();
        img.onload = async () => {
          try {
            
            let width = img.naturalWidth;
            let height = img.naturalHeight;
            const maxSize = 800;
            
            if (width > maxSize || height > maxSize) {
              const aspectRatio = width / height;
              if (width > height) {
                width = maxSize;
                height = maxSize / aspectRatio;
              } else {
                height = maxSize;
                width = maxSize * aspectRatio;
              }
            }
            
            
            const { addImage } = useDrawingStore.getState();
            if (addImage) {
              await addImage({
                url: dataUrl,
                x: 100, 
                y: 100,
                width: width,
                height: height,
                originalWidth: img.naturalWidth,
                originalHeight: img.naturalHeight,
                name: file.name
              });
              showNotification('success', 'Image added to canvas');
            }
          } catch (error) {
            console.error('Error adding image to canvas:', error);
            showNotification('error', 'Failed to add image to canvas');
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      showNotification('error', 'Failed to upload image');
    }
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

  const handleDeleteSelected = () => {
    if (selectedItems.size > 0) {
      deleteSelection();
      showNotification('success', `Deleted ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}`);
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
      {}
      <div className={styles.tb_cover}>
        {}
        <div className={styles.tb_left}>
          {}
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

          {}
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

        {}
        <div className={styles.tb_center}>
          <div className={styles.drawing_tools}>
            <Button
              Icon={MousePointer2}
              isActive={currentTool === 'select'}
              onClick={handleSelectClick}
              label="Select Tool (V)"
            />
            <Button
              Icon={Pen}
              isActive={currentTool === 'pen'}
              onClick={handlePenClick}
              label="Pen Tool (P)"
            />
            {}
            <Button
              Icon={Brain}
              isActive={currentTool === 'aiHandwriting'}
              onClick={handleAiHandwritingClick}
              label={`AI Handwriting Tool (A) ${isAiProcessing ? '- Processing...' : ''}`}
            />
            {}
            <Button
              Icon={ImageIcon}
              onClick={handleImageClick}
              label="Add Image (I)"
            />
            <Button
              Icon={Eraser}
              isActive={currentTool === 'eraser'}
              onClick={handleEraserClick}
              label="Eraser Tool (E)"
            />
            <div className={styles.shape_tool_container}>
              <Button
                Icon={Square}
                isActive={currentTool === 'rectangle'}
                onClick={handleShapeClick}
                label={`Rectangle Tool (R) ${isRoughMode ? '(Rough)' : '(Clean)'}`}
              />
            </div>
            
            {}
            {currentTool === 'select' && selectedItems.size > 0 && (
              <div className={styles.selection_tools}>
                <button
                  className={styles.selection_action_btn}
                  onClick={handleDeleteSelected}
                  title={`Delete ${selectedItems.size} selected item${selectedItems.size > 1 ? 's' : ''}`}
                >
                  <Trash size={16} />
                  <span>Delete ({selectedItems.size})</span>
                </button>
              </div>
            )}

            {}
            {currentTool === 'aiHandwriting' && (
              <div className={styles.ai_tools}>
                {isAiProcessing && (
                  <div className={styles.ai_status}>
                    <div className={styles.ai_spinner}></div>
                    <span>Converting...</span>
                  </div>
                )}
              </div>
            )}
            
            <Button
              Icon={Trash}
              onClick={handleClearClick}
              label="Clear Canvas"
            />
            <Button
              Icon={Undo}
              onClick={handleUndoClick}
              label="Undo (Ctrl+Z)"
            />
          </div>
        </div>

        {}
        <div className={styles.tb_right}>
          {}
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

          {}
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

          {}
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

          {}
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
                  {}
                  <button
                    className={styles.menu_item}
                    onClick={() => { toggleAiTextPanel(); setMenuOpen(false); }}
                  >
                    <Brain size={18} />
                    <span>AI Text Settings</span>
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

      {}
      {currentTool === 'aiHandwriting' && (
        <div className={styles.ai_instructions}>
          <div className={styles.instructions_panel}>
            <div className={styles.instructions_title}>
              <Brain size={16} />
              AI Handwriting Mode
            </div>
            <div className={styles.instructions_list}>
              <span>• Write naturally with your pen or mouse</span>
              <span>• Stop writing for 1 second to trigger conversion</span>
              <span>• Text will appear where your handwriting was</span>
              <span>• Adjust text styling in the AI Text panel</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ToolBar;