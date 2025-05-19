import React from 'react'
import styles from './NotebookInside.module.scss'
import ToolBar from '../../components/ToolBar/Index'
import NoteBookUi from '../../components/NotebookUi/Index'

const NotebookInside = () => {
  return (
    <div className={styles.ni_cover}>

        <div className={styles.toolBar}>
            <ToolBar/>
        </div>

        <div className={styles.ni_canvas_area}>
            <div className={styles.ni_page_setting}></div>
            <div className={styles.ni_canvas}>
                <NoteBookUi/>
            </div>
            <div className={styles.ni_pen_setting}></div>
        </div>
    </div>
  )
}

export default NotebookInside
