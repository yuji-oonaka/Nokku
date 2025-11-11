import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  View,
  LogBox,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { NavigationContainer } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from '@env';
import api from './src/services/api';
import {
  AuthContext,
  AuthContextType,
  DbUser,
} from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import MainTabNavigator from './src/navigators/MainTabNavigator';

LogBox.ignoreLogs(['deprecated']);

function App(): React.JSX.Element {
  const [user, setUser] = useState<DbUser | null>(null);
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async fbUser => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const token = await fbUser.getIdToken(true);
          const response = await api.get('/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(response.data);
        } catch (error) {
          console.error('AuthContext: /profile の取得に失敗', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return subscriber;
  }, []);

  const handleLogout = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      console.error(error);
      Alert.alert('エラー', 'ログアウトに失敗しました。');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const authContextValue: AuthContextType = { user, firebaseUser, loading };

  return (
    <AuthContext.Provider value={authContextValue}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <NavigationContainer>
            {firebaseUser ? (
              <MainTabNavigator onLogout={handleLogout} />
            ) : (
              <AuthScreen />
            )}
          </NavigationContainer>
        </StripeProvider>
      </SafeAreaView>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});

export default App;
