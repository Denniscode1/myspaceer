import { useState, useEffect } from 'react';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Custom hook for Web Push Notifications
 * Handles service worker registration, permission requests, and subscription
 */
export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if service workers and push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      registerServiceWorker();
    }
  }, []);

  /**
   * Register service worker
   */
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registered:', registration);

      // Check for existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
        console.log('📬 Existing push subscription found');
      }
    } catch (err) {
      console.error('❌ Service Worker registration failed:', err);
      setError(err.message);
    }
  };

  /**
   * Request notification permission
   */
  const requestPermission = async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        console.log('✅ Notification permission granted');
        await subscribeToPush();
        return true;
      } else if (result === 'denied') {
        setError('Notification permission denied');
        return false;
      }
    } catch (err) {
      console.error('❌ Permission request failed:', err);
      setError(err.message);
      return false;
    }
  };

  /**
   * Subscribe to push notifications
   */
  const subscribeToPush = async () => {
    if (!isSupported || permission !== 'granted') {
      return null;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;

      // Convert VAPID key from base64 to Uint8Array
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      setSubscription(pushSubscription);
      console.log('✅ Push subscription created:', pushSubscription);

      // Send subscription to backend
      await sendSubscriptionToBackend(pushSubscription);

      return pushSubscription;
    } catch (err) {
      console.error('❌ Push subscription failed:', err);
      setError(err.message);
      return null;
    } finally {
      setIsRegistering(false);
    }
  };

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = async () => {
    if (!subscription) {
      return;
    }

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      console.log('✅ Push subscription removed');

      // Notify backend
      await removeSubscriptionFromBackend(subscription);
    } catch (err) {
      console.error('❌ Unsubscribe failed:', err);
      setError(err.message);
    }
  };

  /**
   * Send test notification
   */
  const sendTestNotification = async () => {
    if (!subscription) {
      setError('No active subscription');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/push/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      console.log('✅ Test notification sent');
    } catch (err) {
      console.error('❌ Test notification failed:', err);
      setError(err.message);
    }
  };

  /**
   * Send subscription to backend
   */
  const sendSubscriptionToBackend = async (pushSubscription) => {
    try {
      const response = await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: pushSubscription,
          userId: localStorage.getItem('userId'),
          userRole: localStorage.getItem('userRole')
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      console.log('✅ Subscription saved to backend');
    } catch (err) {
      console.error('❌ Backend subscription failed:', err);
      // Don't throw - subscription still works locally
    }
  };

  /**
   * Remove subscription from backend
   */
  const removeSubscriptionFromBackend = async (pushSubscription) => {
    try {
      await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: pushSubscription })
      });

      console.log('✅ Subscription removed from backend');
    } catch (err) {
      console.error('❌ Backend unsubscribe failed:', err);
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    isRegistering,
    error,
    requestPermission,
    subscribeToPush,
    unsubscribe,
    sendTestNotification
  };
};

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
