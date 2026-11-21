import React from 'react';
import {
  View,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  ViewProps,
  KeyboardAvoidingViewProps,
  NativeModules,
} from 'react-native';

// Check if native module is linked (custom dev client or bare workflow)
const isNativeLinked = Boolean(NativeModules.KeyboardController);

export interface KeyboardProviderProps {
  children: React.ReactNode;
  statusBarTranslucent?: boolean;
  navigationBarTranslucent?: boolean;
}

export const KeyboardProvider: React.FC<KeyboardProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export interface KeyboardStickyViewProps extends ViewProps {
  offset?: {
    closed?: number;
    opened?: number;
  };
}

export const KeyboardStickyView: React.FC<KeyboardStickyViewProps> = ({
  children,
  style,
  ...props
}) => {
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
};

export const KeyboardAvoidingView: React.FC<KeyboardAvoidingViewProps> = ({
  children,
  style,
  behavior = Platform.OS === 'ios' ? 'padding' : undefined,
  ...props
}) => {
  return (
    <RNKeyboardAvoidingView style={style} behavior={behavior} {...props}>
      {children}
    </RNKeyboardAvoidingView>
  );
};

export const useKeyboardHandler = () => {
  // Safe fallback hook
};

export const KeyboardController = {
  dismiss: () => {},
  setInputMode: () => {},
  setDefaultMode: () => {},
};

export default {
  KeyboardProvider,
  KeyboardStickyView,
  KeyboardAvoidingView,
  useKeyboardHandler,
  KeyboardController,
};
