import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SignUpScreen({ onEmailSignUp, onSwitchToSignIn, authError }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Create your account</Text>
      <Text style={styles.subtitle}>Start reading, writing, and managing your stories in one place.</Text>

      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Full name"
        placeholderTextColor="#8d8578"
      />

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#8d8578"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#8d8578"
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm password"
        placeholderTextColor="#8d8578"
        secureTextEntry
      />

      <Pressable
        style={styles.primaryButton}
        onPress={() => onEmailSignUp({ fullName, email, password, confirmPassword })}
      >
        <Text style={styles.primaryButtonText}>Create account</Text>
      </Pressable>

      {authError ? <Text style={styles.error}>{authError}</Text> : null}

      <View style={styles.row}>
        <Text style={styles.caption}>Already have an account?</Text>
        <Pressable onPress={onSwitchToSignIn}>
          <Text style={styles.link}> Sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7d2c7',
    padding: 16,
    gap: 10
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#201e1a'
  },
  subtitle: {
    fontSize: 14,
    color: '#615948',
    marginBottom: 8
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8d1c2',
    backgroundColor: '#f8f6f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#2b2822'
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: '#2f4d3f',
    alignItems: 'center',
    paddingVertical: 11
  },
  primaryButtonText: {
    color: '#f4f1ea',
    fontWeight: '700'
  },
  error: {
    fontSize: 13,
    color: '#8a1f1f'
  },
  row: {
    flexDirection: 'row',
    marginTop: 2
  },
  caption: {
    fontSize: 13,
    color: '#655c4b'
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2e4a7a'
  }
});
