import React, { useEffect } from 'react';

interface NotificationProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Notification: React.FC<NotificationProps> = ({ 
  message, 
  type = 'success', 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      case 'info': return '#2196f3';
      default: return '#4caf50';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: getBackgroundColor(),
      color: 'white',
      padding: '12px 24px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <span>{message}</span>
      <button 
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: '4px',
          opacity: 0.7,
          fontSize: '20px',
          lineHeight: 1,
          marginLeft: '8px'
        }}
      >
        ×
      </button>
    </div>
  );
}; 