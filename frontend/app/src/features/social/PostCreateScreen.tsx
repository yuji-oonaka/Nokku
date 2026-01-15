import React from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePostCreate } from './hooks/usePostCreate'; // ★作成したHookをインポート

// 表示用フォーマッターのみUI側に残す（あるいはutilsへ移動も可）
const formatDisplayDateTime = (date: Date | null): string => {
  if (!date) return '設定しない';
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PostCreateScreen = () => {
  // ★ たった1行で機能呼び出し
  const {
    title,
    setTitle,
    content,
    setContent,
    loading,
    selectedImage,
    publishAt,
    expiresAt,
    showPublishPicker,
    showExpirePicker,
    androidPickerMode,
    handleChoosePhoto,
    showPublishDatePicker,
    onPublishChange,
    showExpireDatePicker,
    onExpireChange,
    handleSubmit,
  } = usePostCreate();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            {/* タイトル */}
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="お知らせのタイトル"
              placeholderTextColor="#888"
            />

            {/* 内容 */}
            <Text style={styles.label}>投稿内容</Text>
            <TextInput
              style={styles.input}
              value={content}
              onChangeText={setContent}
              placeholder="いまどうしてる？"
              placeholderTextColor="#888"
              multiline={true}
              numberOfLines={6}
            />

            {/* 画像選択 */}
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={handleChoosePhoto}
            >
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewImage}
                />
              ) : (
                <Text style={styles.imagePickerText}>📷 画像を追加 (任意)</Text>
              )}
            </TouchableOpacity>

            {/* オプション */}
            <Text style={styles.sectionHeader}>公開オプション</Text>

            {/* 公開日時 */}
            <View style={styles.datePickerContainer}>
              <Text style={styles.datePickerLabel}>公開日時</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={showPublishDatePicker}
              >
                <Text style={styles.datePickerValue}>
                  {formatDisplayDateTime(publishAt)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 終了日時 */}
            <View style={styles.datePickerContainer}>
              <Text style={styles.datePickerLabel}>掲載終了</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={showExpireDatePicker}
              >
                <Text style={styles.datePickerValue}>
                  {formatDisplayDateTime(expiresAt)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 送信ボタン */}
            <View style={styles.buttonContainer}>
              {loading ? (
                <ActivityIndicator size="large" color="#0A84FF" />
              ) : (
                <Button
                  title="投稿する"
                  onPress={handleSubmit}
                  disabled={loading}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* DatePickers */}
      {showPublishPicker && (
        <DateTimePicker
          value={publishAt || new Date()}
          mode={Platform.OS === 'ios' ? 'datetime' : androidPickerMode}
          display="default"
          onChange={onPublishChange}
          minimumDate={new Date()}
        />
      )}
      {showExpirePicker && (
        <DateTimePicker
          value={expiresAt || publishAt || new Date()}
          mode={Platform.OS === 'ios' ? 'datetime' : androidPickerMode}
          display="default"
          onChange={onExpireChange}
          minimumDate={publishAt || new Date()}
        />
      )}
    </SafeAreaView>
  );
};

// スタイル定義は変更なし（そのまま利用）
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  form: {
    padding: 20,
    backgroundColor: '#1C1C1E',
    margin: 15,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF',
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 5,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#333333',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 20,
    backgroundColor: '#333333',
    color: '#FFFFFF',
  },
  imagePicker: {
    height: 180,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    marginBottom: 10,
    overflow: 'hidden',
  },
  imagePickerText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerLabel: {
    fontSize: 15,
    color: '#DDD',
  },
  datePickerButton: {
    backgroundColor: '#333333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 140,
    alignItems: 'center',
  },
  datePickerValue: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 30,
  },
});

export default PostCreateScreen;
