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
    // Persist error messages longer than regular notifications
    const actualDuration = type === 'error' ? duration * 2 : duration;
    console.log(`Notification shown: ${message} (${type}) - will disappear in ${actualDuration}ms`);
    
    const timer = setTimeout(() => {
      onClose();
    }, actualDuration);
    return () => clearTimeout(timer);
  }, [duration, onClose, message, type]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      case 'info': return '#2196f3';
      default: return '#4caf50';
    }
  };

  // Get icon based on notification type
  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'info': return 'ℹ';
      default: return '';
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
      padding: '14px 28px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'slideUp 0.3s ease-out',
      minWidth: '300px',
      maxWidth: '500px'
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        {getIcon()}
      </div>
      <span style={{ flex: 1, fontWeight: type === 'error' ? 'bold' : 'normal' }}>{message}</span>
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