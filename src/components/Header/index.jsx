// components/organisms/Header/Header.jsx - Updated with data directory settings
import React, { useState, useEffect } from 'react'
import styles from './Header.module.scss'
import { BadgePlus, FolderOpen } from 'lucide-react'
import Button from '../atoms/Button/Button'
import NotebookForm from '../NoteBookForm/NoteBookForm'

const Header = () => {

  const [showForm, setShowForm] = useState(false);


  const handleCreateNotebook = () => {
    // Clear any potential event listeners by forcing a reflow
    setTimeout(() => {
      setShowForm(true);
    }, 0);
  };

  const handleCloseForm = () => {
    setShowForm(false);

    // Clear focus and force reflow after closing
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
      // Force garbage collection of any remaining event listeners
      window.dispatchEvent(new Event('resize'));
    }, 100);
  };

  return (
    <>
      <div className={styles.header_cover}>
        <div className={styles.header_title}>
          <h1>InkDrawo</h1>
        </div>

        {/* <div className={styles.header_searchBar}>
          <SearchBar />
        </div> */}

        <div className={styles.header_actions}>
          <Button
            Icon={FolderOpen}
            label={"Data Directory"}
          />
          <Button
            Icon={BadgePlus}
            label={"New Notebook"}
            onClick={handleCreateNotebook} 
          />
        </div>

        {showForm && (
          <NotebookForm
            key={`form-${Date.now()}`}
            onClose={handleCloseForm}
          />
        )}
      </div>
    </>
  )
}

export default Header