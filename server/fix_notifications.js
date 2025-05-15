import mysql from 'mysql2';

// Create connection
const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  port: 3307,
  password: '123456',
  database: 'slanakajewel'
});

// Get all notifications
const getAllNotifications = () => {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM notifications';
    
    con.query(sql, (err, results) => {
      if (err) {
        console.error('Error fetching notifications:', err);
        reject(err);
      } else {
        console.log(`Found ${results.length} notifications`);
        resolve(results);
      }
    });
  });
};

// Update a notification's target_roles
const updateNotificationRoles = (notificationId, targetRoles) => {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE notifications SET target_roles = ? WHERE notification_id = ?';
    
    con.query(sql, [targetRoles, notificationId], (err, result) => {
      if (err) {
        console.error(`Error updating notification ${notificationId}:`, err);
        reject(err);
      } else {
        console.log(`Updated notification ${notificationId}`);
        resolve(result);
      }
    });
  });
};

// Fix all notifications
const fixNotifications = async () => {
  try {
    const notifications = await getAllNotifications();
    
    for (const notification of notifications) {
      let targetRoles;
      
      // Determine the appropriate target roles based on the notification type
      if (notification.type === 'sales') {
        targetRoles = JSON.stringify([
          "admin", "Admin", 
          "store manager", "Store Manager", "storemanager", 
          "cashier", "Cashier"
        ]);
      } else if (notification.type === 'inventory_order') {
        targetRoles = JSON.stringify([
          "admin", "Admin", 
          "store manager", "Store Manager", "storemanager"
        ]);
      } else if (notification.type === 'low_stock') {
        targetRoles = JSON.stringify([
          "admin", "Admin", 
          "store manager", "Store Manager", "storemanager", 
          "sales associate", "Sales Associate", "salesassociate"
        ]);
      } else {
        // Default to all roles
        targetRoles = JSON.stringify([
          "admin", "Admin", 
          "store manager", "Store Manager", "storemanager", 
          "sales associate", "Sales Associate", "salesassociate",
          "cashier", "Cashier"
        ]);
      }
      
      await updateNotificationRoles(notification.notification_id, targetRoles);
    }
    
    console.log('All notifications fixed successfully');
  } catch (error) {
    console.error('Error fixing notifications:', error);
  } finally {
    con.end();
  }
};

// Execute the function
fixNotifications();
