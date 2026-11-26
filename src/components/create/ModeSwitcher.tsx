import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

export type CreatePostMode = 'POST' | 'EVENT' | 'NOTICE';

interface ModeSwitcherProps {
  currentMode: CreatePostMode;
  onSelectMode: (mode: CreatePostMode) => void;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({
  currentMode,
  onSelectMode,
}) => {
  const modes: CreatePostMode[] = ['POST', 'EVENT', 'NOTICE'];

  const handlePress = (mode: CreatePostMode) => {
    if (mode === currentMode) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onSelectMode(mode);
  };

  return (
    <View style={styles.floatingWrapper} pointerEvents="box-none">
      <BlurView intensity={55} tint="dark" style={styles.blurContainer}>
        <View style={styles.innerPill}>
          {modes.map((mode) => {
            const isActive = currentMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.modeTab, isActive && styles.modeTabActive]}
                onPress={() => handlePress(mode)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeText, isActive && styles.modeTextActive]}>
                  {mode}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  innerPill: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: 'rgba(18, 18, 18, 0.65)',
    borderRadius: 24,
  },
  modeTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#F5F5F5',
  },
  modeText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  modeTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
});
