// src/components/Notification/Notification.jsx - NEW COMPONENT
import React, { useEffect } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import styles from './Notification.module.scss';

const Notification = () => {
  const { notification, clearNotification } = useUIStore();

  // Auto-hide notification
  useEffect(() => {
    if (notification && notification.duration > 0) {
      const timer = setTimeout(() => {
        clearNotification();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'warning':
        return <AlertCircle size={20} />;
      case 'info':
      default:
        return <Info size={20} />;
    }
  };

  const handleClose = () => {
    clearNotification();
  };

  return (
    <div className={`${styles.notification} ${styles[notification.type]}`}>
      <div className={styles.content}>
        <div className={styles.icon}>
          {getIcon()}
        </div>
        <div className={styles.message}>
          {notification.message}
        </div>
        <button 
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Notification;