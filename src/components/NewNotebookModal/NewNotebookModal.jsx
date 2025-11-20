
import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './NewNotebookModal.module.scss';

const NewNotebookModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: '#8b5cf6', 
    totalPages: 100 
  });
  
  const [formErrors, setFormErrors] = useState({
    title: ''
  });
  
  
  const colorOptions = [
    { id: 'purple', value: '#8b5cf6' },
    { id: 'red', value: '#ef4444' },
    { id: 'orange', value: '#f59e0b' },
    { id: 'green', value: '#10b981' },
    { id: 'blue', value: '#3b82f6' },
    { id: 'pink', value: '#ec4899' },
    { id: 'teal', value: '#14b8a6' },
    { id: 'amber', value: '#f97316' }
  ];
  
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };
  
  
  const handleColorSelect = (color) => {
    setFormData({
      ...formData,
      color
    });
  };
  
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const now = new Date();
      const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
      
      onSubmit({
        ...formData,
        date: formattedDate,
        createdAt: now.toISOString()
      });
    }
  };
  
  
  const handleModalContentClick = (e) => {
    e.stopPropagation();
  };
  
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={handleModalContentClick}>
        <div className={styles.modalHeader}>
          <h2>Create New Notebook</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.notebookForm}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter notebook title"
              className={formErrors.title ? styles.errorInput : ''}
            />
            {formErrors.title && (
              <span className={styles.errorText}>{formErrors.title}</span>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="description">Description (optional)</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add a description for your notebook"
              rows="3"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Cover Color</label>
            <div className={styles.colorPicker}>
              {colorOptions.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className={`${styles.colorOption} ${formData.color === color.value ? styles.selected : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleColorSelect(color.value)}
                  aria-label={`Select ${color.id} color`}
                />
              ))}
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="totalPages">Total Pages</label>
            <select
              id="totalPages"
              name="totalPages"
              value={formData.totalPages}
              onChange={handleChange}
            >
              <option value="50">50 pages</option>
              <option value="100">100 pages</option>
              <option value="200">200 pages</option>
              <option value="300">300 pages</option>
              <option value="500">500 pages</option>
            </select>
          </div>
          
          <div className={styles.formActions}>
            <button 
              type="button" 
              className={styles.cancelButton}
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
            >
              Create Notebook
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewNotebookModal;