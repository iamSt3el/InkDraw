import React from 'react'
import styles from './NotebookUi.module.scss'

const NoteBookUi = () => {
    const numberOfHoles = 27;

    return (
        <div className={styles.notebookui_cover}>
            <div className={styles.notebookui_holes_div}>
                {Array.from({ length: numberOfHoles }).map((_, index) => (
                    <div key={index} className={styles.notebookui_holes}></div>
                ))}
            </div>
        </div>
    );
}

NoteBookUi.displayName = 'NoteBookUi';

export default NoteBookUi;