import React from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar, StyleProp, ViewStyle } from 'react-native';

export interface SpinnerLoaderProps {
  size?: 'small' | 'large';
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const SpinnerLoader: React.FC<SpinnerLoaderProps> = ({
  size = 'small',
  color = '#F5F5F5',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
