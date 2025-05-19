import React from 'react';
import styles from './ToolBar.module.scss';
import Button from '../atoms/Button/Button';
import { Menu, Pen, Eraser, MoveLeft, Trash, Undo } from 'lucide-react';
import { useDrawingStore } from '../../stores/drawingStore';

const ToolBar = () => {
  // Get currentTool and setTool from the store
  const { 
    currentTool, 
    setTool, 
    clearCanvas, 
    undoCanvas 
  } = useDrawingStore();
  
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
        <Button Icon={Menu} />
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