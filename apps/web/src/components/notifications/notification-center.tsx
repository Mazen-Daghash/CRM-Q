'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Bell, Check, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    loadNotifications();
    const socketInstance = connectSocket();

    return () => {
      if (socketInstance) {
        console.log('Disconnecting socket');
        socketInstance.disconnect();
      }
    };
  }, []);

  // Reload notifications when modal opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const connectSocket = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('No access token found for socket connection');
      return null;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const baseUrl = apiUrl.replace('/api', '');
    
    console.log('Connecting to socket at:', `${baseUrl}/notifications`);
    
    const newSocket = io(`${baseUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Connected to notifications socket');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    newSocket.on('notification', (data: any) => {
      console.log('Received notification:', data);
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
      // Show toast notification based on type
      if (data.payload?.status === 'APPROVED' || (data.type === 'LEAVE_UPDATE' && data.payload?.status === 'APPROVED')) {
        toast.success(data.title, {
          description: data.message,
          duration: 5000,
        });
      } else if (data.payload?.status === 'REJECTED' || (data.type === 'LEAVE_UPDATE' && data.payload?.status === 'REJECTED')) {
        toast.error(data.title, {
          description: data.message,
          duration: 5000,
        });
      } else {
        toast.info(data.title, {
          description: data.message,
          duration: 5000,
        });
      }
    });

    setSocket(newSocket);
    return newSocket;
  };

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
      const unread = response.data.filter((n: any) => !n.readAt).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };


  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 ${!notification.readAt ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.readAt && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="rounded-full p-1 hover:bg-gray-200"
                          >
                            <Check className="h-4 w-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

