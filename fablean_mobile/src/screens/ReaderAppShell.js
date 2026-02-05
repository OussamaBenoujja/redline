import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import NovelHomeScreen from './NovelHomeScreen';
import ProfileMenuScreen from './ProfileMenuScreen';
import SettingsMenuScreen from './SettingsMenuScreen';

const TABS = [
  { id: 'home', label: 'Home', icon: 'Library' },
  { id: 'profile', label: 'Profile', icon: 'Author' },
  { id: 'settings', label: 'Settings', icon: 'Control' }
];

export default function ReaderAppShell({ session, onSignOut }) {
  const [activeTab, setActiveTab] = useState('home');

  const greeting = useMemo(() => {
    const rawName = session?.fullName || session?.email || 'Reader';
    return rawName.split('@')[0];
  }, [session]);

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Fablean Reader</Text>
          <Text style={styles.greeting}>Welcome back, {greeting}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'home' ? <NovelHomeScreen /> : null}
        {activeTab === 'profile' ? <ProfileMenuScreen session={session} /> : null}
        {activeTab === 'settings' ? <SettingsMenuScreen onSignOut={onSignOut} /> : null}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tabButton, active && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    gap: 10
  },
  header: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d8ccb9',
    backgroundColor: '#fffdf8',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  kicker: {
    fontSize: 12,
    color: '#6f6658',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700'
  },
  greeting: {
    marginTop: 4,
    fontSize: 22,
    color: '#221f19',
    fontWeight: '700'
  },
  content: {
    flex: 1
  },
  tabBar: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8c9af',
    backgroundColor: '#fffdf8',
    padding: 8,
    flexDirection: 'row',
    gap: 8
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#eadfcf',
    backgroundColor: '#fff'
  },
  tabButtonActive: {
    borderColor: '#315646',
    backgroundColor: '#315646'
  },
  tabIcon: {
    fontSize: 11,
    color: '#766d5f',
    fontWeight: '700'
  },
  tabIconActive: {
    color: '#d8f4e5'
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b4337'
  },
  tabLabelActive: {
    color: '#f1faf5'
  }
});
