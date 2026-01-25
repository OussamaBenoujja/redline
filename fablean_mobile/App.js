import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  GOOGLE_AUTH_CONFIG,
  googleAuthMissingHint,
  isGoogleAuthConfigured
} from './src/config/auth';
import ReaderAppShell from './src/screens/ReaderAppShell';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';

WebBrowser.maybeCompleteAuthSession();

const DEMO_USER = {
  email: 'demo@fablean.app',
  password: 'Demo@12345',
  fullName: 'Fablean Demo Reader'
};

function GoogleAuthGateway({ onReady, onSuccess, onError }) {
  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_AUTH_CONFIG);

  useEffect(() => {
    onReady({ request, promptAsync });
  }, [onReady, request, promptAsync]);

  useEffect(() => {
    if (response?.type === 'success') {
      const providerData = response.authentication || response.params || {};
      onSuccess({
        provider: 'google',
        email: providerData.email || 'google-user@placeholder.local'
      });
    }

    if (response?.type === 'error') {
      onError('Google sign-in failed. Please try again.');
    }
  }, [onError, onSuccess, response]);

  return null;
}

export default function App() {
  const [authMode, setAuthMode] = useState('signin');
  const [authError, setAuthError] = useState('');
  const [session, setSession] = useState(null);
  const [googlePromptAsync, setGooglePromptAsync] = useState(null);
  const [googleReady, setGoogleReady] = useState(false);

  const googleConfigured = isGoogleAuthConfigured();
  const googleMissingHint = googleAuthMissingHint();

  const handleGoogleReady = useCallback(({ request, promptAsync }) => {
    setGooglePromptAsync(() => promptAsync);
    setGoogleReady(Boolean(request));
  }, []);

  const handleGoogleSuccess = useCallback((googleSession) => {
    setSession(googleSession);
    setAuthError('');
  }, []);

  const handleGoogleError = useCallback((message) => {
    setAuthError(message);
  }, []);

  const handleEmailSignIn = ({ email, password }) => {
    if (!email || !password) {
      setAuthError('Please enter email and password.');
      return;
    }

    if (email === DEMO_USER.email && password === DEMO_USER.password) {
      setSession({
        provider: 'demo',
        email: DEMO_USER.email,
        fullName: DEMO_USER.fullName
      });
      setAuthError('');
      return;
    }

    setAuthError('Invalid credentials. Use the demo account or create a new account.');
    return;
  };

  const handleEmailSignUp = ({ fullName, email, password, confirmPassword }) => {
    if (!fullName || !email || !password || !confirmPassword) {
      setAuthError('Please complete all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setSession({ provider: 'email', email, fullName });
    setAuthError('');
  };

  const handleGoogleSignIn = async () => {
    if (!googleConfigured) {
      setAuthError(`Google auth is not configured yet. ${googleMissingHint}.`);
      return;
    }

    if (!googlePromptAsync) {
      setAuthError('Google auth is not ready yet. Please try again in a moment.');
      return;
    }

    try {
      await googlePromptAsync();
    } catch (error) {
      setAuthError(`Google sign-in error: ${error.message}`);
    }
  };

  const handleSignOut = () => {
    setSession(null);
    setAuthMode('signin');
    setAuthError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {googleConfigured ? (
        <GoogleAuthGateway
          onReady={handleGoogleReady}
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />
      ) : null}
      <View style={styles.inner}>
        <Text style={styles.title}>Fablean Mobile</Text>

        {!session ? (
          authMode === 'signin' ? (
            <SignInScreen
              onEmailSignIn={handleEmailSignIn}
              onGoogleSignIn={handleGoogleSignIn}
              onSwitchToSignUp={() => {
                setAuthMode('signup');
                setAuthError('');
              }}
              isGoogleReady={googleReady && googleConfigured}
              isGoogleConfigured={googleConfigured}
              googleMissingHint={googleMissingHint}
              demoUser={DEMO_USER}
              authError={authError}
            />
          ) : (
            <SignUpScreen
              onEmailSignUp={handleEmailSignUp}
              onSwitchToSignIn={() => {
                setAuthMode('signin');
                setAuthError('');
              }}
              authError={authError}
            />
          )
        ) : (
          <ReaderAppShell session={session} onSignOut={handleSignOut} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f2ec'
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f1d1a'
  }
});
