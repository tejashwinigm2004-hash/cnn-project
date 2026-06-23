// Sends a push notification to a single device using Expo's push notification service
async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken) {
    console.log('No push token provided, skipping notification');
    return;
  }
 
  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  };
 
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    const result = await response.json();
    console.log('Push notification result:', result);
    return result;
  } catch (err) {
    console.error('Error sending push notification:', err.message);
  }
}
 
// Sends the same notification to multiple devices at once
async function sendPushNotificationToMany(pushTokens, title, body, data = {}) {
  const validTokens = pushTokens.filter(Boolean);
  if (validTokens.length === 0) {
    console.log('No valid push tokens to send to');
    return;
  }
 
  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));
 
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const result = await response.json();
    console.log('Bulk push notification result:', result);
    return result;
  } catch (err) {
    console.error('Error sending bulk push notifications:', err.message);
  }
}
 
module.exports = { sendPushNotification, sendPushNotificationToMany };