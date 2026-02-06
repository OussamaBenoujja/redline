import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { API_BASE_URL, checkHealth } from '../config/api';

function SettingToggle({ label, description, value, onValueChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleBody}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: '#2f6a4c' }} />
    </View>
  );
}

export default function SettingsMenuScreen({ onSignOut }) {
  const [notifications, setNotifications] = useState(true);
  const [wifiOnlyDownloads, setWifiOnlyDownloads] = useState(true);
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const [showMature, setShowMature] = useState(false);
  const [apiState, setApiState] = useState({ loading: false, message: '' });

  const runHealthCheck = async () => {
    setApiState({ loading: true, message: 'Checking API...' });

    try {
      const health = await checkHealth();
      setApiState({ loading: false, message: `API online (${health.status})` });
    } catch (error) {
      setApiState({ loading: false, message: `API error: ${error.message}` });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Pressable style={styles.rowButton}>
            <Text style={styles.rowLabel}>Edit profile</Text>
            <Text style={styles.rowHint}>Open</Text>
          </Pressable>
          <Pressable style={styles.rowButton}>
            <Text style={styles.rowLabel}>Privacy controls</Text>
            <Text style={styles.rowHint}>Manage</Text>
          </Pressable>
          <Pressable style={styles.rowButton} onPress={onSignOut}>
            <Text style={[styles.rowLabel, styles.signOutText]}>Sign out</Text>
            <Text style={styles.rowHint}>Now</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reading Preferences</Text>
        <View style={styles.card}>
          <SettingToggle
            label="Push Notifications"
            description="New chapter alerts and reading reminders."
            value={notifications}
            onValueChange={setNotifications}
          />
          <SettingToggle
            label="Download on Wi-Fi only"
            description="Save mobile data when caching chapters."
            value={wifiOnlyDownloads}
            onValueChange={setWifiOnlyDownloads}
          />
          <SettingToggle
            label="Dyslexia-friendly font"
            description="Use a readability-focused font style."
            value={dyslexicFont}
            onValueChange={setDyslexicFont}
          />
          <SettingToggle
            label="Show mature titles"
            description="Include mature novels in browse results."
            value={showMature}
            onValueChange={setShowMature}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer</Text>
        <View style={styles.card}>
          <Text style={styles.devLabel}>API Base URL</Text>
          <Text style={styles.devValue}>{API_BASE_URL}</Text>
          <Pressable style={styles.healthButton} onPress={runHealthCheck} disabled={apiState.loading}>
            <Text style={styles.healthButtonText}>{apiState.loading ? 'Checking...' : 'Run API health check'}</Text>
          </Pressable>
          {apiState.message ? <Text style={styles.devHint}>{apiState.message}</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: 24,
    gap: 12
  },
  section: {
    gap: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#231f18'
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d9ccb6',
    backgroundColor: '#fffdf8',
    overflow: 'hidden'
  },
  rowButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ece3d2'
  },
  rowLabel: {
    fontSize: 14,
    color: '#322d25',
    fontWeight: '600'
  },
  signOutText: {
    color: '#8d2020'
  },
  rowHint: {
    fontSize: 12,
    color: '#756c5d'
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ece3d2'
  },
  toggleBody: {
    flex: 1,
    gap: 3
  },
  toggleLabel: {
    fontSize: 14,
    color: '#332f27',
    fontWeight: '600'
  },
  toggleDescription: {
    fontSize: 12,
    color: '#70685a'
  },
  devLabel: {
    paddingHorizontal: 12,
    paddingTop: 12,
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#6d6454',
    fontWeight: '700'
  },
  devValue: {
    paddingHorizontal: 12,
    paddingTop: 6,
    color: '#2f2b24',
    fontSize: 13
  },
  healthButton: {
    margin: 12,
    borderRadius: 10,
    backgroundColor: '#2f4f40',
    alignItems: 'center',
    paddingVertical: 10
  },
  healthButtonText: {
    color: '#eef7f2',
    fontWeight: '700'
  },
  devHint: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    color: '#655d4f',
    fontSize: 12
  }
});
