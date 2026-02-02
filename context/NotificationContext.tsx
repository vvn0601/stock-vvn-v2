import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Toast } from '../components/ui/Toast';

type NotificationType = 'success' | 'error';
interface NotificationContextType {
  notify: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

  const notify = (type: NotificationType, message: string) => {
    setNotification({ type, message });
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within a NotificationProvider");
  return context;
};