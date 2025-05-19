import React from 'react';
import styles from './NotebookInside.module.scss';
import ToolBar from '../../components/ToolBar/Index';
import NoteBookUi from '../../components/NotebookUi/Index';
import PagePanel from '../../components/PagePanel/PagePanel';
import PenPanel from '../../components/PenPanel/PenPanel';

const NotebookInside = () => {
  return (
    <div className={styles.ni_cover}>
      <div className={styles.toolBar}>
        <ToolBar />
      </div>

      <div className={styles.ni_canvas_area}>
        <div className={styles.ni_page_setting}>
          <PagePanel/>
        </div>
        <div className={styles.ni_canvas}>
          <NoteBookUi />
        </div>
        <div className={styles.ni_pen_setting}>
          <PenPanel/>
        </div>
      </div>
    </div>
  );
};

export default NotebookInside;