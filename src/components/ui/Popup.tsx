import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './Popup.module.css';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  className?: string;
}

const Popup: React.FC<PopupProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  ariaLabelledBy,
  ariaDescribedBy,
  className
}) => {
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Trap focus within the modal - a more robust solution might use a library
      // For now, ensure the modal itself can be focused for screen readers
    } else {
      document.removeEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      className={`${styles.backdrop} fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`} 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      <div 
        className={`${styles.panel} bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto ${className || ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Popup;
