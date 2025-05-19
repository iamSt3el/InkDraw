import React from 'react'
import styles from './NoteBookManager.module.scss'
import Header from '../../components/Header';
import NoteBookCard from '../../components/NotebookCard';

const NotebookManager = () => {
    return (
        <div className={styles.nm_cover}>

            <div className={styles.nm_header}>
                <Header/>
            </div>

            <div className={styles.nm_notebooks}>
                <NoteBookCard/>
            </div>

        </div>
    )
}

export default NotebookManager;
