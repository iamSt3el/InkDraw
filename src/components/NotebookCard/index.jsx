// src/components/molecules/NoteBookCard/NoteBookCard.jsx - Fixed delete button and progress display
import React, { useState } from 'react'
import styles from './NotebookCard.module.scss'
import { Trash2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useNotebookStore } from '../../stores/noteBookStore'

const NoteBookCard = ({ notebook }) => {
  const { deleteNotebook } = useNotebookStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const numberOfHoles = 19;

  // Default values in case notebook prop is not provided
  const {
    id = 1,
    title = "What is DSA",
    description = "This notebook contains notes about DSA. Like Array, linked list and trees.",
    date = "14/05/2025",
    pages = [], // This is the array of page IDs
    totalPages = 100, // This is the total pages limit
    currentPage = 1,
    progress = 0,
    gradient = "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)"
  } = notebook || {};

  // Calculate actual progress based on current page and total pages
  const actualProgress = totalPages ? Math.round((currentPage / totalPages) * 100) : 0;

  // Determine how many pages have been created vs total allowed
  const createdPages = Array.isArray(pages) ? pages.length : 0;
  const totalAllowedPages = totalPages || 100;


  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent card click
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (e) => {
    e.stopPropagation();
    try {
      await deleteNotebook(id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting notebook:', error);
      // Keep modal open on error
    }
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const DeleteModal = () => (
    <div className={styles.delete_modal_overlay} onClick={handleCancelDelete}>
      <div className={styles.delete_modal} onClick={(e) => e.stopPropagation()}>
        <h3>Delete Notebook</h3>
        <p>Are you sure you want to delete "{title}"? This action cannot be undone.</p>
        <div className={styles.delete_modal_buttons}>
          <button
            className={styles.cancel_button}
            onClick={handleCancelDelete}
          >
            Cancel
          </button>
          <button
            className={styles.confirm_delete_button}
            onClick={handleConfirmDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={styles.notebook_card}>
        <div className={styles.notebook_card_cover} style={{ background: gradient }}>
          <div className={styles.notebook_card_hole_div}>
            {Array.from({ length: numberOfHoles }).map((_, index) => (
              <div key={index} className={styles.notebook_card_holes}>
                <div className={styles.checkmark}></div>
              </div>
            ))}
          </div>

          <div className={styles.notebook_card_content}>
            <div className={styles.notebook_card_header}>
              <div className={styles.notebook_card_date}>
                <h4>{date}</h4>
              </div>

              <button
                className={styles.delete_button}
                onClick={handleDeleteClick}
                title="Delete notebook"
                aria-label={`Delete notebook ${title}`}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className={styles.notebook_card_title}>
              <h2>{title}</h2>
            </div>

            <div className={styles.notebook_card_description}>
              <p>{description}</p>
            </div>

            <div className={styles.notebook_card_progress_content}>
              <div className={styles.page_number}>
                <h4>Page: {currentPage}/{totalAllowedPages}</h4>
              </div>

              <div className={styles.progress}>
                <h4>{actualProgress}%</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Render Delete Confirmation Modal using Portal */}
      {showDeleteConfirm && createPortal(<DeleteModal />, document.body)}
    </>
  )
}

export default NoteBookCard