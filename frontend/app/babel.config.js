module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // 他のプラグインがここにあるかもしれませんが...
    'react-native-reanimated/plugin', // ← これを最後に追加
  ],
};
