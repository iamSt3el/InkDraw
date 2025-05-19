import React from 'react';
import styles from './NotebookInside.module.scss';
import ToolBar from '../../components/ToolBar/Index';
import NoteBookUi from '../../components/NotebookUi/Index';
import PageSettingPanel from '../../components/PagePanel/PagePanel';
import PenSettingPanel from '../../components/PenPanel/PenPanel';
import { useDrawingStore } from '../../stores/drawingStore';

const NotebookInside = () => {
  const { currentTool } = useDrawingStore();
  return (
    <div className={styles.ni_cover}>
      <div className={styles.toolBar}>
        <ToolBar />
      </div>

      <div className={styles.ni_canvas_area}>
        <div className={styles.ni_page_setting}>
          <PageSettingPanel />
        </div>
        <div className={styles.ni_canvas}>
          <NoteBookUi />
        </div>
        <div className={styles.ni_pen_setting}>
          {currentTool === 'pen' ? (<PenSettingPanel />) : null }
        </div>
      </div>
    </div>
  );
};

export default NotebookInside;