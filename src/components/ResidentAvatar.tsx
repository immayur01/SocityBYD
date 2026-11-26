import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Camera, Edit3 } from 'lucide-react-native';

const AVATAR_COLORS = [
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#2563EB', // Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#DB2777', // Pink
  '#0891B2', // Cyan
  '#64748B', // Slate
];

export function getAvatarColor(name?: string): string {
  if (!name || !name.trim()) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'R';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface ResidentAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: number;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
  fallbackColor?: string;
  onPress?: () => void;
  showEditBadge?: boolean;
  isLoading?: boolean;
  badgeIcon?: 'camera' | 'edit';
}

export const ResidentAvatar: React.FC<ResidentAvatarProps> = ({
  name,
  avatarUrl,
  size = 40,
  borderRadius,
  borderColor,
  borderWidth = 0,
  style,
  fallbackColor,
  onPress,
  showEditBadge = false,
  isLoading = false,
  badgeIcon = 'camera',
}) => {
  const [imgError, setImgError] = useState(false);
  const radius = borderRadius !== undefined ? borderRadius : size / 2;
  const initials = getInitials(name);
  const bgColor = fallbackColor || getAvatarColor(name);
  const fontSize = Math.max(10, Math.round(size * 0.38));

  // Reset imgError if avatarUrl changes
  React.useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const hasValidImage = Boolean(avatarUrl && avatarUrl.trim().length > 0 && !imgError);

  const content = (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: hasValidImage ? 'transparent' : bgColor,
          borderColor,
          borderWidth: borderColor ? borderWidth || 1 : 0,
        },
        style,
      ]}
    >
      {hasValidImage ? (
        <Image
          source={{ uri: avatarUrl! }}
          style={[styles.image, { borderRadius: radius }]}
          contentFit="cover"
          transition={150}
          onError={() => setImgError(true)}
        />
      ) : (
        <Text
          style={[
            styles.initialsText,
            {
              fontSize,
              lineHeight: fontSize * 1.2,
            },
          ]}
          numberOfLines={1}
        >
          {initials}
        </Text>
      )}

      {/* Subtle Upload / Refresh Loading Spinner Overlay */}
      {isLoading && (
        <View
          style={[
            styles.loadingOverlay,
            { borderRadius: radius },
          ]}
        >
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      )}

      {/* Camera / Edit Badge */}
      {showEditBadge && (
        <View
          style={[
            styles.editBadge,
            {
              width: Math.max(26, Math.round(size * 0.32)),
              height: Math.max(26, Math.round(size * 0.32)),
              borderRadius: Math.max(13, Math.round(size * 0.16)),
              bottom: 0,
              right: 0,
              borderWidth: 2,
            },
          ]}
        >
          {badgeIcon === 'edit' ? (
            <Edit3 size={Math.max(12, Math.round(size * 0.16))} color="#FFFFFF" strokeWidth={2} />
          ) : (
            <Camera size={Math.max(12, Math.round(size * 0.16))} color="#FFFFFF" strokeWidth={2} />
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        disabled={isLoading}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    backgroundColor: '#09090B',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});
