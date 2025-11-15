import * as Notifications from "expo-notifications";
import { useEffect, useRef } from 'react';

// export function useNotificationObserver() {
//   const notificationListener = useRef();
//   const responseListener = useRef();

//   useEffect(() => {
//     // Handle notifications received while app is foregrounded
//     notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
//       console.log('Notification received:', notification);
//     });

//     // Handle user tapping on notification
//     responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
//       console.log('Notification tapped:', response);
//       // Navigate to specific screen based on notification data
//     });

//     return () => {
//       Notifications.removeNotificationSubscription(notificationListener.current);
//       Notifications.removeNotificationSubscription(responseListener.current);
//     };
//   }, []);
// }

export function setupNotificationListeners() {
  // Foreground notifications
  Notifications.addNotificationReceivedListener(notification => {
    console.log("Notification received:", notification);
    // Optionally, show an alert
    // Alert.alert(notification.request.content.title, notification.request.content.body);
  });

  // User taps notification (background or terminated)
  Notifications.addNotificationResponseReceivedListener(response => {
    console.log("User tapped notification:", response);
    // Handle navigation or other logic
  });
}