"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle, Package, ShoppingCart, X } from "lucide-react";
// Import date-fns functions when the package is installed
// import { format, formatDistanceToNow } from "date-fns";

// Define the notification interface
interface Notification {
  notification_id: number;
  title: string;
  message: string;
  type: 'sales' | 'inventory_order' | 'low_stock';
  created_at: string;
  expires_at: string;
  is_read: boolean;
  target_roles: string[];
  branch_id: number | null;
  related_id: number | null;
  related_type: string | null;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();

    // Set up an interval to refresh notifications every 30 seconds
    const intervalId = setInterval(fetchNotifications, 30000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching notifications...');

      const response = await fetch("http://localhost:3002/notifications", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      console.log('Notifications response:', data);

      if (data.success) {
        // Process notifications to ensure they have the correct type
        const processedNotifications = data.data.map((notification: any) => {
          // Log each notification for debugging
          console.log('Processing notification:', notification);

          // Ensure the notification has a valid type
          if (!['sales', 'inventory_order', 'low_stock'].includes(notification.type)) {
            console.log(`Notification ${notification.notification_id} has invalid type: ${notification.type}`);

            // Try to determine the type from other fields
            if (notification.related_type === 'sale') {
              notification.type = 'sales';
            } else if (notification.related_type === 'order') {
              notification.type = 'inventory_order';
            } else if (notification.related_type === 'item') {
              notification.type = 'low_stock';
            } else if (notification.title && notification.title.toLowerCase().includes('sale')) {
              notification.type = 'sales';
            } else if (notification.title && (notification.title.toLowerCase().includes('inventory') ||
                      notification.title.toLowerCase().includes('order'))) {
              notification.type = 'inventory_order';
            } else if (notification.title && (notification.title.toLowerCase().includes('stock') ||
                      notification.title.toLowerCase().includes('low'))) {
              notification.type = 'low_stock';
            } else {
              // Default to sales if we can't determine the type
              notification.type = 'sales';
            }

            console.log(`Assigned type ${notification.type} to notification ${notification.notification_id}`);
          }

          return notification;
        });

        setNotifications(processedNotifications);

        // Log notification counts by type
        const salesCount = processedNotifications.filter(n => n.type === 'sales').length;
        const inventoryCount = processedNotifications.filter(n => n.type === 'inventory_order').length;
        const lowStockCount = processedNotifications.filter(n => n.type === 'low_stock').length;

        console.log(`Loaded ${processedNotifications.length} notifications: ${salesCount} sales, ${inventoryCount} inventory, ${lowStockCount} low stock`);
      } else {
        throw new Error(data.message || "Failed to fetch notifications");
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3002/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }

      // Update the local state
      setNotifications(
        notifications.map((notification) =>
          notification.notification_id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err: any) {
      console.error("Error marking notification as read:", err);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3002/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      // Remove the notification from the local state
      setNotifications(
        notifications.filter(
          (notification) => notification.notification_id !== id
        )
      );
    } catch (err: any) {
      console.error("Error deleting notification:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    // Normalize the type to handle different formats
    const normalizedType = type?.toLowerCase() || '';

    console.log(`Getting icon for notification type: ${type} (normalized: ${normalizedType})`);

    if (normalizedType === 'sales' || normalizedType.includes('sale')) {
      return <ShoppingCart className="text-green-600" size={20} />;
    } else if (normalizedType === 'inventory_order' || normalizedType.includes('inventory') || normalizedType.includes('order')) {
      return <Package className="text-blue-600" size={20} />;
    } else if (normalizedType === 'low_stock' || normalizedType.includes('stock') || normalizedType.includes('low')) {
      return <Bell className="text-red-600" size={20} />;
    } else {
      console.log(`Unknown notification type: ${type}`);
      return <Bell className="text-gray-600" size={20} />;
    }
  };

  const getNotificationColor = (type: string) => {
    // Normalize the type to handle different formats
    const normalizedType = type?.toLowerCase() || '';

    console.log(`Getting color for notification type: ${type} (normalized: ${normalizedType})`);

    if (normalizedType === 'sales' || normalizedType.includes('sale')) {
      return "bg-green-50 border-green-200";
    } else if (normalizedType === 'inventory_order' || normalizedType.includes('inventory') || normalizedType.includes('order')) {
      return "bg-blue-50 border-blue-200";
    } else if (normalizedType === 'low_stock' || normalizedType.includes('stock') || normalizedType.includes('low')) {
      return "bg-red-50 border-red-200";
    } else {
      console.log(`Unknown notification type for color: ${type}`);
      return "bg-gray-50 border-gray-200";
    }
  };

  const getTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return 'just now';
      }

      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      }

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      }

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      }

      return date.toLocaleDateString();
    } catch (error) {
      return "Unknown time";
    }
  };

  const getFormattedDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Format: Month Day, Year
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      return date.toLocaleDateString(undefined, options);
    } catch (error) {
      return "Unknown date";
    }
  };

  const filteredNotifications = activeFilter
    ? notifications.filter((notification) => {
        const notificationType = notification.type?.toLowerCase() || '';
        const filter = activeFilter.toLowerCase();

        if (filter === 'sales') {
          return notificationType === 'sales' || notificationType.includes('sale');
        } else if (filter === 'inventory_order') {
          return notificationType === 'inventory_order' ||
                 (notificationType.includes('inventory') || notificationType.includes('order'));
        } else if (filter === 'low_stock') {
          return notificationType === 'low_stock' ||
                 (notificationType.includes('stock') || notificationType.includes('low'));
        }

        return notificationType === filter;
      })
    : notifications;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-700">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-3 py-1 rounded-md text-sm ${
              activeFilter === null
                ? "bg-yellow-400 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("sales")}
            className={`px-3 py-1 rounded-md text-sm ${
              activeFilter === "sales"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => setActiveFilter("inventory_order")}
            className={`px-3 py-1 rounded-md text-sm ${
              activeFilter === "inventory_order"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveFilter("low_stock")}
            className={`px-3 py-1 rounded-md text-sm ${
              activeFilter === "low_stock"
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Low Stock
          </button>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Bell size={48} className="mx-auto mb-4 text-gray-300" />
          <p>No notifications found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.notification_id}
              className={`p-4 border rounded-md ${
                getNotificationColor(notification.type)
              } ${notification.is_read ? "opacity-70" : ""}`}
            >
              <div className="flex justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {notification.title}
                      {!notification.is_read && (
                        <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </h3>
                    <p className="text-gray-600 mt-1">{notification.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{getTimeAgo(notification.created_at)}</span>
                      <span>Expires: {getFormattedDate(notification.expires_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.notification_id)}
                      className="p-1 rounded-full hover:bg-gray-200"
                      title="Mark as read"
                    >
                      <CheckCircle size={16} className="text-green-600" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.notification_id)}
                    className="p-1 rounded-full hover:bg-gray-200"
                    title="Delete notification"
                  >
                    <X size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
