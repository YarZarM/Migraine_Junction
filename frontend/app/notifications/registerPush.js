import * as Notifications from "expo-notifications";
import { Platform } from 'react-native';
import * as Device from "expo-device";
import axios from "axios";

export async function registerForPushNotifications() {
  // if (!Device.isDevice) {
  //   return console.log("Must use physical device for push notifications");
  // }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E6F4FE',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permission not granted");
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: "98decf00-8468-4ad1-bcf4-11857c6e5d52"
  })).data;
  console.log("Expo Push Token:", token);

  // send token to backend
  await axios.post("http://172.20.10.3:5000/api/register-token", {
    user_id: "YZMM",
    fcm_token: token, // yes you can store expo token here
  });
}
