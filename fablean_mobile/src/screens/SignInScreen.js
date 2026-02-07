import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SignInScreen({
  onEmailSignIn,
  onGoogleSignIn,
  onSwitchToSignUp,
  isGoogleReady,
  isGoogleConfigured,
  googleMissingHint,
  demoUser,
  authError
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const applyDemoUser = () => {
    if (!demoUser) {
      return;
    }

    setEmail(demoUser.email);
    setPassword(demoUser.password);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Sign in to continue</Text>
      <Text style={styles.subtitle}>Access your stories and keep writing where you left off.</Text>

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

      <Pressable
        style={styles.primaryButton}
        onPress={() => onEmailSignIn({ email, password })}
      >
        <Text style={styles.primaryButtonText}>Sign in</Text>
      </Pressable>

      {demoUser ? (
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo test user</Text>
          <Text style={styles.demoCreds}>Email: {demoUser.email}</Text>
          <Text style={styles.demoCreds}>Password: {demoUser.password}</Text>
          <Pressable style={styles.demoButton} onPress={applyDemoUser}>
            <Text style={styles.demoButtonText}>Use demo account</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={[styles.googleButton, !isGoogleReady && styles.disabledButton]}
        onPress={onGoogleSignIn}
        disabled={!isGoogleReady}
      >
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </Pressable>

      {!isGoogleConfigured ? (
        <Text style={styles.hint}>Google auth is disabled. {googleMissingHint}.</Text>
      ) : null}

      {authError ? <Text style={styles.error}>{authError}</Text> : null}

      <View style={styles.row}>
        <Text style={styles.caption}>New here?</Text>
        <Pressable onPress={onSwitchToSignUp}>
          <Text style={styles.link}> Create account</Text>
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
  demoBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dacdb7',
    backgroundColor: '#f8f4eb',
    padding: 10,
    gap: 4
  },
  demoTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#6a5a3d',
    fontWeight: '700'
  },
  demoCreds: {
    fontSize: 12,
    color: '#3b352a'
  },
  demoButton: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b8a27f',
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fffaf0'
  },
  demoButtonText: {
    fontWeight: '700',
    color: '#5e4a2a',
    fontSize: 12
  },
  googleButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cabfa8',
    alignItems: 'center',
    paddingVertical: 11,
    backgroundColor: '#fcfbf7'
  },
  googleButtonText: {
    color: '#3f3a2d',
    fontWeight: '600'
  },
  disabledButton: {
    opacity: 0.55
  },
  hint: {
    fontSize: 12,
    color: '#6f6653'
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
