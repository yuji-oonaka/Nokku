import React from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';

type ProductAdminControlsProps = {
  visible: boolean; // 表示するかどうか
  onEdit: () => void;
  onDelete: () => void;
};

const ProductAdminControls: React.FC<ProductAdminControlsProps> = ({
  visible,
  onEdit,
  onDelete,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>管理者・出品者メニュー</Text>
      <View style={styles.buttonRow}>
        <View style={styles.buttonWrapper}>
          <Button title="編集する" color="#0A84FF" onPress={onEdit} />
        </View>
        <View style={styles.buttonWrapper}>
          <Button title="削除する" color="#FF3B30" onPress={onDelete} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    color: '#888',
    fontSize: 12,
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  buttonWrapper: {
    width: '45%',
  },
});

export default ProductAdminControls;
