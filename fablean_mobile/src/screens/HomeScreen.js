import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL, checkHealth } from '../config/api';

export default function HomeScreen() {
  const [state, setState] = useState({
    loading: false,
    status: 'Not checked yet',
    details: ''
  });

  const runHealthCheck = async () => {
    setState({ loading: true, status: 'Checking API...', details: '' });

    try {
      const health = await checkHealth();
      setState({
        loading: false,
        status: 'API online',
        details: JSON.stringify(health)
      });
    } catch (error) {
      setState({
        loading: false,
        status: 'API unavailable',
        details: error.message
      });
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Base URL</Text>
      <Text style={styles.baseUrl}>{API_BASE_URL}</Text>

      <Text style={styles.label}>Connection</Text>
      <Text style={styles.status}>{state.status}</Text>

      {state.details ? <Text style={styles.details}>{state.details}</Text> : null}

      <Pressable style={styles.button} onPress={runHealthCheck} disabled={state.loading}>
        <Text style={styles.buttonText}>{state.loading ? 'Checking...' : 'Retry health check'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9d2c4',
    padding: 16,
    gap: 8
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#7d6c4f'
  },
  baseUrl: {
    fontSize: 13,
    color: '#2d2a24'
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    color: '#201e1a'
  },
  details: {
    fontSize: 13,
    color: '#4a463e'
  },
  button: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: '#2f4d3f'
  },
  buttonText: {
    color: '#f7f4ee',
    fontWeight: '700'
  }
});
