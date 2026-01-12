import React from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthForm } from './hooks/useAuthForm'; // 先ほど作成したフックをインポート

const AuthScreen: React.FC = () => {
  // カスタムフックから状態とロジックを取得
  const { mode, setMode, loading, form, actions } = useAuthForm();

  // タイトルの切り替え
  const renderTitle = () => {
    switch (mode) {
      case 'login':
        return 'NOKKU ログイン';
      case 'register':
        return 'NOKKU 新規登録';
      case 'reset':
        return 'パスワードの再設定';
    }
  };

  // メインボタンのラベル切り替え
  const renderButtonTitle = () => {
    switch (mode) {
      case 'login':
        return 'ログイン';
      case 'register':
        return '登録する';
      case 'reset':
        return '再設定メールを送信';
    }
  };

  // アクションの振り分け
  const handleMainAction = () => {
    switch (mode) {
      case 'login':
        return actions.login();
      case 'register':
        return actions.register();
      case 'reset':
        return actions.resetPassword();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.form}>
            <Text style={styles.title}>{renderTitle()}</Text>

            {/* --- 新規登録モードのみ表示: 名前入力 --- */}
            {mode === 'register' && (
              <>
                <Text style={styles.label}>本名 (非公開)</Text>
                <TextInput
                  style={styles.input}
                  value={form.realName}
                  onChangeText={form.setRealName}
                  placeholder="例: 山田 太郎 (決済用)"
                  placeholderTextColor="#888"
                  autoCapitalize="words"
                />
                <Text style={styles.label}>ニックネーム (公開)</Text>
                <TextInput
                  style={styles.input}
                  value={form.nickname}
                  onChangeText={form.setNickname}
                  placeholder="例: ノックファン (表示用)"
                  placeholderTextColor="#888"
                  autoCapitalize="none"
                />
              </>
            )}

            {/* --- 全モード共通: Email --- */}
            <Text style={styles.label}>メールアドレス</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={form.setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* --- パスワード (リセット時以外) --- */}
            {mode !== 'reset' && (
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>パスワード</Text>
                  {mode === 'login' && (
                    <TouchableOpacity onPress={() => setMode('reset')}>
                      <Text style={styles.forgotPasswordText}>忘れた場合</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  value={form.password}
                  onChangeText={form.setPassword}
                  placeholder="6文字以上"
                  placeholderTextColor="#888"
                  secureTextEntry
                />
              </>
            )}

            {/* --- アクションボタン --- */}
            <View style={styles.buttonSpacing}>
              {loading ? (
                <ActivityIndicator size="large" color="#0A84FF" />
              ) : (
                <Button
                  title={renderButtonTitle()}
                  onPress={handleMainAction}
                  color="#0A84FF"
                />
              )}
            </View>

            {/* --- モード切替フッター --- */}
            <View style={styles.footerLinks}>
              {mode === 'login' && (
                <TouchableOpacity onPress={() => setMode('register')}>
                  <Text style={styles.linkText}>
                    アカウントをお持ちでない方は{' '}
                    <Text style={styles.linkHighlight}>新規登録</Text>
                  </Text>
                </TouchableOpacity>
              )}

              {(mode === 'register' || mode === 'reset') && (
                <TouchableOpacity onPress={() => setMode('login')}>
                  <Text style={styles.linkText}>
                    すでにアカウントをお持ちの方は{' '}
                    <Text style={styles.linkHighlight}>ログイン</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  form: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonSpacing: {
    marginTop: 30,
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#0A84FF',
    fontSize: 13,
  },
  footerLinks: {
    alignItems: 'center',
    marginTop: 10,
  },
  linkText: {
    color: '#888',
    fontSize: 14,
  },
  linkHighlight: {
    color: '#0A84FF',
    fontWeight: 'bold',
  },
});

export default AuthScreen;
