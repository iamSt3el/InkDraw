
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import styles from './PageNavigator.module.scss';

const PageNavigator = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  onPreviousPage, 
  onNextPage 
}) => {
  const [showPageInput, setShowPageInput] = useState(false);
  const [inputValue, setInputValue] = useState(currentPage.toString());

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(inputValue);
    
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    } else {
      setInputValue(currentPage.toString());
    }
    
    setShowPageInput(false);
  };

  const handlePageInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handlePageClick = () => {
    setInputValue(currentPage.toString());
    setShowPageInput(true);
  };

  const generatePageNumbers = () => {
    const pages = [];
    const delta = 2; 
    
    
    if (currentPage > delta + 2) {
      pages.push(1);
      if (currentPage > delta + 3) {
        pages.push('...');
      }
    }
    
    
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(totalPages, currentPage + delta); i++) {
      pages.push(i);
    }
    
    
    if (currentPage < totalPages - delta - 1) {
      if (currentPage < totalPages - delta - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className={styles.pageNavigator}>
      <button
        className={`${styles.navButton} ${currentPage === 1 ? styles.disabled : ''}`}
        onClick={onPreviousPage}
        disabled={currentPage === 1}
        title="Previous page (Ctrl+←)"
      >
        <ChevronLeft size={16} />
      </button>

      <div className={styles.pageNumbers}>
        {generatePageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                <MoreHorizontal size={16} />
              </span>
            );
          }

          return (
            <button
              key={page}
              className={`${styles.pageNumber} ${page === currentPage ? styles.active : ''}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          );
        })}
      </div>

      <div className={styles.pageInfo}>
        {showPageInput ? (
          <form onSubmit={handlePageInputSubmit} className={styles.pageInputForm}>
            <input
              type="number"
              value={inputValue}
              onChange={handlePageInputChange}
              onBlur={() => setShowPageInput(false)}
              className={styles.pageInput}
              min="1"
              max={totalPages}
              autoFocus
            />
            <span className={styles.totalPages}>/ {totalPages}</span>
          </form>
        ) : (
          <div className={styles.pageDisplay} onClick={handlePageClick}>
            <span className={styles.currentPage}>{currentPage}</span>
            <span className={styles.totalPages}>/ {totalPages}</span>
          </div>
        )}
      </div>

      <button
        className={`${styles.navButton} ${currentPage === totalPages ? styles.disabled : ''}`}
        onClick={onNextPage}
        disabled={currentPage === totalPages}
        title="Next page (Ctrl+→)"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default PageNavigator;