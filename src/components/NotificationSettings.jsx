import { useState, useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import './NotificationSettings.css';

export const NotificationSettings = ({ userId }) => {
  const {
    isSupported,
    permission,
    subscription,
    isRegistering,
    error,
    requestPermission,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications();

  const [preferences, setPreferences] = useState({
    email: true,
    sms: false,
    push: false,
    queueUpdates: true,
    statusChanges: true,
    doctorAssignments: true,
    treatmentReady: true,
    criticalAlerts: true,
    doNotDisturb: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00'
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load preferences from backend
    loadPreferences();
  }, [userId]);

  useEffect(() => {
    // Update push preference based on subscription
    if (subscription) {
      setPreferences(prev => ({ ...prev, push: true }));
    }
  }, [subscription]);

  const loadPreferences = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/preferences/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, preferences })
      });

      if (!response.ok) throw new Error('Failed to save');
      console.log('✅ Preferences saved');
    } catch (err) {
      console.error('❌ Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushToggle = async () => {
    if (subscription) {
      await unsubscribe();
      setPreferences(prev => ({ ...prev, push: false }));
    } else {
      const granted = await requestPermission();
      if (granted) {
        setPreferences(prev => ({ ...prev, push: true }));
      }
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="notification-settings">
      <h2>🔔 Notification Settings</h2>

      {!isSupported && (
        <div className="alert alert-warning">
          ⚠️ Push notifications are not supported in your browser
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {/* Notification Channels */}
      <section className="settings-section">
        <h3>Notification Channels</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <strong>📧 Email Notifications</strong>
            <p>Receive notifications via email</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={(e) => handlePreferenceChange('email', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <strong>📱 SMS Notifications</strong>
            <p>Receive text messages for critical updates</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.sms}
              onChange={(e) => handlePreferenceChange('sms', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <strong>🔔 Push Notifications</strong>
            <p>Browser notifications even when app is closed</p>
            {subscription && <span className="badge-success">Active</span>}
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.push && subscription}
              onChange={handlePushToggle}
              disabled={!isSupported || isRegistering}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {subscription && (
          <button onClick={sendTestNotification} className="btn-test">
            📬 Send Test Notification
          </button>
        )}
      </section>

      {/* Notification Types */}
      <section className="settings-section">
        <h3>Notification Types</h3>

        <div className="setting-item">
          <div className="setting-info">
            <strong>Queue Position Updates</strong>
            <p>When your position in the queue changes</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.queueUpdates}
              onChange={(e) => handlePreferenceChange('queueUpdates', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <strong>Status Changes</strong>
            <p>When your case status is updated</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.statusChanges}
              onChange={(e) => handlePreferenceChange('statusChanges', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <strong>Doctor Assignments</strong>
            <p>When a doctor is assigned to your case</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.doctorAssignments}
              onChange={(e) => handlePreferenceChange('doctorAssignments', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <strong>Treatment Ready</strong>
            <p>When doctor is ready to see you</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.treatmentReady}
              onChange={(e) => handlePreferenceChange('treatmentReady', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <strong>🚨 Critical Alerts</strong>
            <p>Urgent notifications (always enabled)</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.criticalAlerts}
              disabled
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </section>

      {/* Quiet Hours */}
      <section className="settings-section">
        <h3>Quiet Hours</h3>

        <div className="setting-item">
          <div className="setting-info">
            <strong>Do Not Disturb</strong>
            <p>Silence non-critical notifications during quiet hours</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.doNotDisturb}
              onChange={(e) => handlePreferenceChange('doNotDisturb', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {preferences.doNotDisturb && (
          <div className="quiet-hours">
            <div className="time-picker">
              <label>
                Start Time
                <input
                  type="time"
                  value={preferences.quietHoursStart}
                  onChange={(e) => handlePreferenceChange('quietHoursStart', e.target.value)}
                />
              </label>
            </div>
            <div className="time-picker">
              <label>
                End Time
                <input
                  type="time"
                  value={preferences.quietHoursEnd}
                  onChange={(e) => handlePreferenceChange('quietHoursEnd', e.target.value)}
                />
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Save Button */}
      <div className="settings-actions">
        <button 
          onClick={savePreferences} 
          className="btn-save"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : '💾 Save Preferences'}
        </button>
      </div>

      {/* Permission Info */}
      {permission === 'denied' && (
        <div className="alert alert-info">
          <strong>ℹ️ Push Notifications Blocked</strong>
          <p>You've blocked push notifications. To enable them:</p>
          <ol>
            <li>Click the lock icon in your browser's address bar</li>
            <li>Find "Notifications" and set to "Allow"</li>
            <li>Refresh the page</li>
          </ol>
        </div>
      )}
    </div>
  );
};
