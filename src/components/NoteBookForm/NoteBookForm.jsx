
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './NoteBookForm.module.scss';
import { X } from 'lucide-react';
import { useNotebookStore } from '../../stores/noteBookStore';

const NotebookForm = ({ onClose }) => {
  const { addNotebook, isLoading, error } = useNotebookStore();

  const TITLE_MAX_LENGTH = 30;
  const DESCRIPTION_MAX_LENGTH = 120;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: '#8b5cf6',
    pages: 100
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const presetColors = [
    { color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)' },
    { color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)' },
    { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)' },
    { color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' },
    { color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' },
    { color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)' },
    { color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)' },
    { color: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    let finalValue = value;
    if (name === 'title' && value.length > TITLE_MAX_LENGTH) {
      finalValue = value.slice(0, TITLE_MAX_LENGTH);
    } else if (name === 'description' && value.length > DESCRIPTION_MAX_LENGTH) {
      finalValue = value.slice(0, DESCRIPTION_MAX_LENGTH);
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));

    
    if (formError) {
      setFormError('');
    }
  };

  const handleColorSelect = (color) => {
    setFormData(prev => ({
      ...prev,
      color
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    
    if (!formData.title.trim()) {
      setFormError('Please enter a notebook title');
      return;
    }

    if (!formData.description.trim()) {
      setFormError('Please enter a notebook description');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const notebookData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        color: formData.color,
        totalPages: parseInt(formData.pages),
        date: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      };

      console.log('Creating notebook with data:', notebookData);

      
      const newNotebook = await addNotebook(notebookData);
      
      console.log('Notebook created successfully:', newNotebook);
      
      
      onClose();
    } catch (error) {
      console.error('Error creating notebook:', error);
      setFormError(error.message || 'Failed to create notebook. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  
  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  
  const modalContent = (
    <div className={styles.formOverlay}>
      <div className={styles.notebookFormContainer}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Create New Notebook</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.notebookForm}>
          {}
          {formError && (
            <div className={styles.errorMessage}>
              <span>⚠️</span>
              {formError}
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="title">
                Notebook Title
                <span className={`${styles.characterCount} ${formData.title.length > TITLE_MAX_LENGTH * 0.9 ? styles.danger :
                    formData.title.length > TITLE_MAX_LENGTH * 0.8 ? styles.warning : ''
                  }`}>
                  {formData.title.length}/{TITLE_MAX_LENGTH}
                </span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g., Data Structures & Algorithms"
                required
                disabled={isSubmitting}
                maxLength={TITLE_MAX_LENGTH}
                autoComplete="off"
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="pages">
                Pages
              </label>
              <div className={styles.rangeContainer}>
                <input
                  type="range"
                  id="pages"
                  name="pages"
                  value={formData.pages}
                  onChange={handleInputChange}
                  className={styles.rangeInput}
                  min="50"
                  max="500"
                  step="10"
                  disabled={isSubmitting}
                />
                <span className={styles.pagesValue}>{formData.pages}</span>
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="description">
              Description
              <span className={`${styles.characterCount} ${formData.description.length > DESCRIPTION_MAX_LENGTH * 0.9 ? styles.danger :
                  formData.description.length > DESCRIPTION_MAX_LENGTH * 0.8 ? styles.warning : ''
                }`}>
                {formData.description.length}/{DESCRIPTION_MAX_LENGTH}
              </span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.formTextarea}
              placeholder="Describe what this notebook is about..."
              required
              disabled={isSubmitting}
              maxLength={DESCRIPTION_MAX_LENGTH}
              autoComplete="off"
            />
          </div>

          <div className={styles.colorSection}>
            <div className={styles.colorSectionTitle}>Choose Color Theme</div>

            <div className={styles.colorGrid}>
              {presetColors.map((colorItem, index) => (
                <div
                  key={index}
                  className={`${styles.colorOption} ${formData.color === colorItem.color ? styles.selected : ''
                    } ${isSubmitting ? styles.disabled : ''}`}
                  style={{ background: colorItem.gradient }}
                  onClick={() => !isSubmitting && handleColorSelect(colorItem.color)}
                />
              ))}
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? 'Creating...' : 'Create Notebook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  
  return createPortal(modalContent, document.body);
};

export default NotebookForm;