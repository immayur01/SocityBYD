import React, { useRef } from 'react';
import { View, TextInput, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, length = 6 }) => {
  const { tokens, isDark } = useTheme();
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const handleChange = (text: string, index: number) => {
    // If user pastes multi-digit text
    if (text.length > 1) {
      const sanitized = text.replace(/[^0-9]/g, '').slice(0, length);
      onChange(sanitized);
      const nextFocus = Math.min(sanitized.length, length - 1);
      inputsRef.current[nextFocus]?.focus();
      return;
    }

    const singleDigit = text.replace(/[^0-9]/g, '');
    const chars = value.split('');
    chars[index] = singleDigit;
    const newOtp = chars.join('').slice(0, length);
    onChange(newOtp);

    // Auto advance to next box
    if (singleDigit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        const chars = value.split('');
        chars[index - 1] = '';
        onChange(chars.join(''));
      }
    }
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, i) => {
        const isFilled = Boolean(digit);
        return (
          <TextInput
            key={i}
            ref={(ref) => {
              inputsRef.current[i] = ref;
            }}
            style={[
              styles.box,
              {
                backgroundColor: isDark ? '#141414' : '#F4F4F5',
                borderColor: isFilled
                  ? (isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.4)')
                  : tokens.borderSubtle,
                color: tokens.textPrimary,
              },
            ]}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleChange(text, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            textAlign="center"
            selectTextOnFocus
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
  },
  box: {
    width: 48,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 20,
    fontWeight: '600',
  },
});
