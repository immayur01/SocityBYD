import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  useWindowDimensions,
  Image as RNImage,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  X,
  ChevronDown,
  Camera,
  Layers,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { island } from '@/context/IslandContext';
import { AttachedMediaItem } from '@/services/uploadQueue';
import { AlbumSheet, AlbumItem } from './sheets/AlbumSheet';

interface MediaPickerStepProps {
  selectedMedia: AttachedMediaItem[];
  onChangeSelectedMedia: (items: AttachedMediaItem[]) => void;
  onNext: () => void;
  onSkipTextOnly: () => void;
  onClose: () => void;
}

const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_VIDEO_DURATION_SEC = 240; // 4 minutes

type AspectRatioMode = '1:1' | '4:5' | 'Original';

export const MediaPickerStep: React.FC<MediaPickerStepProps> = ({
  selectedMedia,
  onChangeSelectedMedia,
  onNext,
  onSkipTextOnly,
  onClose,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Media Library state
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumItem>({
    id: 'recents',
    title: 'Recents',
  });
  const [showAlbumSheet, setShowAlbumSheet] = useState(false);

  // Multi-select toggle
  const [isMultiSelect, setIsMultiSelect] = useState(selectedMedia.length > 1);

  // Currently focused item in the preview stage
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Aspect ratio mode
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('1:1');

  // Video preview sound toggle
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  // Pinch-to-zoom & Pan gesture state for preview stage
  const scaleVal = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Preview Stage Height (~42% of screen)
  const previewHeight = Math.round(screenHeight * 0.42);

  // Active preview item
  const currentMedia: AttachedMediaItem | undefined =
    selectedMedia[focusedIndex] || selectedMedia[0];

  // Video player
  const videoUri = currentMedia?.type === 'video' ? currentMedia.uri : null;
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = isVideoMuted;
    p.play();
  });

  useEffect(() => {
    if (player) {
      player.muted = isVideoMuted;
    }
  }, [player, isVideoMuted]);

  // Request media library permission & fetch initial assets
  const fetchAssets = useCallback(async (albumId?: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setHasPermission(false);
        return;
      }
      setHasPermission(true);

      const params: MediaLibrary.AssetsOptions = {
        first: 80,
        mediaType: ['photo', 'video'],
        sortBy: ['creationTime'],
      };

      if (albumId && albumId !== 'recents') {
        params.album = albumId;
      }

      const res = await MediaLibrary.getAssetsAsync(params);
      setAssets(res.assets);

      // Default select first item if nothing selected yet
      if (selectedMedia.length === 0 && res.assets.length > 0) {
        const first = res.assets[0];
        const isVideo = first.mediaType === 'video';
        onChangeSelectedMedia([
          {
            type: isVideo ? 'video' : 'image',
            uri: first.uri,
            name: first.filename,
            width: first.width,
            height: first.height,
            duration: first.duration ? Math.round(first.duration) : undefined,
          },
        ]);
      }

      // Load albums
      const fetchedAlbums = await MediaLibrary.getAlbumsAsync();
      const albumList: AlbumItem[] = [
        { id: 'recents', title: 'Recents', assetCount: res.totalCount },
        ...fetchedAlbums.map((a) => ({
          id: a.id,
          title: a.title,
          assetCount: a.assetCount,
        })),
      ];
      setAlbums(albumList);
    } catch (e) {
      setHasPermission(false);
    }
  }, [selectedMedia.length, onChangeSelectedMedia]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Handle switching album
  const handleSelectAlbum = (album: AlbumItem) => {
    setSelectedAlbum(album);
    fetchAssets(album.id);
  };

  // Pinch & Pan gesture handlers for photo preview
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scaleVal.value = Math.max(1, Math.min(savedScale.value * e.scale, 3.5));
    })
    .onEnd(() => {
      savedScale.value = scaleVal.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedPreviewStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scaleVal.value },
    ],
  }));

  const resetTransform = () => {
    scaleVal.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  // Cycle aspect ratio
  const cycleAspectRatio = () => {
    if (aspectRatio === '1:1') setAspectRatio('4:5');
    else if (aspectRatio === '4:5') setAspectRatio('Original');
    else setAspectRatio('1:1');
    resetTransform();
  };

  // Asset selection
  const handleSelectAsset = async (asset: MediaLibrary.Asset) => {
    const isVideo = asset.mediaType === 'video';

    // Validate video duration & size
    if (isVideo) {
      if (asset.duration && asset.duration > MAX_VIDEO_DURATION_SEC) {
        island.error('Video Too Long', 'Maximum allowed video duration is 4 minutes.');
        return;
      }
    }

    const newItem: AttachedMediaItem = {
      type: isVideo ? 'video' : 'image',
      uri: asset.uri,
      name: asset.filename,
      width: asset.width,
      height: asset.height,
      duration: asset.duration ? Math.round(asset.duration) : undefined,
    };

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    if (!isMultiSelect) {
      onChangeSelectedMedia([newItem]);
      setFocusedIndex(0);
      resetTransform();
      return;
    }

    // Multi-select toggle
    const existingIndex = selectedMedia.findIndex((m) => m.uri === asset.uri);
    if (existingIndex !== -1) {
      // Deselect
      const filtered = selectedMedia.filter((m) => m.uri !== asset.uri);
      onChangeSelectedMedia(filtered);
      setFocusedIndex(0);
    } else {
      // Add up to 10
      if (selectedMedia.length >= 10) {
        island.info('Maximum 10 items', 'You can select up to 10 photos or videos.');
        return;
      }
      const updated = [...selectedMedia, newItem];
      onChangeSelectedMedia(updated);
      setFocusedIndex(updated.length - 1);
      resetTransform();
    }
  };

  // Camera capture button handler
  const handleLaunchCamera = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.9,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const item = res.assets[0];
        const newItem: AttachedMediaItem = {
          type: item.type === 'video' ? 'video' : 'image',
          uri: item.uri,
          name: item.fileName || `camera_${Date.now()}.${item.type === 'video' ? 'mp4' : 'jpg'}`,
          width: item.width,
          height: item.height,
          duration: item.duration ? Math.round(item.duration / 1000) : undefined,
          size: item.fileSize,
        };
        onChangeSelectedMedia([...selectedMedia, newItem]);
        setFocusedIndex(selectedMedia.length);
      }
    } catch (e) {
      island.error('Camera Error', 'Could not open camera.');
    }
  };

  // Fallback device picker when permission denied
  const handlePickFromDeviceFallback = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: isMultiSelect,
        quality: 0.9,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newItems: AttachedMediaItem[] = res.assets.map((item) => ({
          type: item.type === 'video' ? 'video' : 'image',
          uri: item.uri,
          name: item.fileName || `media_${Date.now()}`,
          width: item.width,
          height: item.height,
          duration: item.duration ? Math.round(item.duration / 1000) : undefined,
          size: item.fileSize,
        }));
        onChangeSelectedMedia(newItems);
        setFocusedIndex(0);
      }
    } catch (e) {
      island.error('Picker Error', 'Could not open media library.');
    }
  };

  // Calculate preview frame aspect style
  const previewFrameStyle = useMemo(() => {
    if (aspectRatio === '1:1') {
      return { width: Math.min(screenWidth, previewHeight), height: Math.min(screenWidth, previewHeight) };
    }
    if (aspectRatio === '4:5') {
      const h = previewHeight;
      const w = Math.round(h * 0.8);
      return { width: Math.min(w, screenWidth), height: h };
    }
    // Original aspect ratio
    return { width: screenWidth, height: previewHeight };
  }, [aspectRatio, screenWidth, previewHeight]);

  // Grid column size
  const gridItemSize = Math.floor((screenWidth - 6) / 4);

  return (
    <View style={styles.container}>
      {/* 1. Top Bar (height 52) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={20} strokeWidth={1.5} color="#F5F5F5" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>New Post</Text>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            onPress={onSkipTextOnly}
            style={styles.skipBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>Text Only</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNext}
            disabled={selectedMedia.length === 0}
            style={[
              styles.nextPill,
              selectedMedia.length === 0 && styles.nextPillDisabled,
            ]}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.nextPillText,
                selectedMedia.length === 0 && styles.nextPillTextDisabled,
              ]}
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Live Preview Stage (~42% height) */}
      <View style={[styles.previewStage, { height: previewHeight }]}>
        {currentMedia ? (
          <View style={[styles.previewFrameWrapper, previewFrameStyle]}>
            {currentMedia.type === 'video' ? (
              <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                nativeControls={false}
              />
            ) : (
              <GestureDetector gesture={composedGesture}>
                <Animated.View style={[StyleSheet.absoluteFill, animatedPreviewStyle]}>
                  <RNImage
                    source={{ uri: currentMedia.uri }}
                    style={styles.previewImage}
                    resizeMode={aspectRatio === 'Original' ? 'contain' : 'cover'}
                  />
                </Animated.View>
              </GestureDetector>
            )}

            {/* Bottom-left floating aspect ratio pill */}
            {currentMedia.type === 'image' && (
              <TouchableOpacity
                style={styles.aspectRatioPill}
                onPress={cycleAspectRatio}
                activeOpacity={0.8}
              >
                <Text style={styles.aspectRatioText}>{aspectRatio}</Text>
              </TouchableOpacity>
            )}

            {/* Video sound toggle overlay */}
            {currentMedia.type === 'video' && (
              <TouchableOpacity
                style={styles.soundPill}
                onPress={() => setIsVideoMuted((prev) => !prev)}
                activeOpacity={0.8}
              >
                {isVideoMuted ? (
                  <VolumeX size={14} strokeWidth={1.5} color="#FFFFFF" />
                ) : (
                  <Volume2 size={14} strokeWidth={1.5} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyPreviewText}>Select a photo or video</Text>
          </View>
        )}
      </View>

      {/* 3. Inline Gallery Tray Header */}
      <View style={styles.trayHeader}>
        {/* Album Dropdown Button */}
        <TouchableOpacity
          style={styles.albumSelectBtn}
          onPress={() => setShowAlbumSheet(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.albumSelectText}>{selectedAlbum.title}</Text>
          <ChevronDown size={15} strokeWidth={1.5} color="#F5F5F5" style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Right Actions: Multi-Select Toggle & Camera */}
        <View style={styles.trayActionsRight}>
          <TouchableOpacity
            style={[
              styles.multiSelectBtn,
              isMultiSelect && styles.multiSelectBtnActive,
            ]}
            onPress={() => {
              setIsMultiSelect((prev) => {
                const next = !prev;
                if (!next && selectedMedia.length > 1) {
                  onChangeSelectedMedia([selectedMedia[0]]);
                  setFocusedIndex(0);
                }
                return next;
              });
            }}
            activeOpacity={0.8}
          >
            <Layers
              size={14}
              strokeWidth={1.5}
              color={isMultiSelect ? '#000000' : '#A1A1AA'}
            />
            <Text
              style={[
                styles.multiSelectText,
                isMultiSelect && styles.multiSelectTextActive,
              ]}
            >
              Multi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cameraIconBtn}
            onPress={handleLaunchCamera}
            activeOpacity={0.7}
          >
            <Camera size={16} strokeWidth={1.5} color="#F5F5F5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. 4-Column Grid or Permission Fallback */}
      {hasPermission === false ? (
        <View style={styles.permissionFallback}>
          <Text style={styles.permText}>Allow access to your photos to browse gallery</Text>
          <TouchableOpacity
            style={styles.permAllowBtn}
            onPress={() => fetchAssets()}
            activeOpacity={0.8}
          >
            <Text style={styles.permAllowText}>Allow Access</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permDeviceBtn}
            onPress={handlePickFromDeviceFallback}
            activeOpacity={0.8}
          >
            <Text style={styles.permDeviceText}>Choose from Files / Device</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          numColumns={4}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => {
            const selectedIdx = selectedMedia.findIndex((m) => m.uri === item.uri);
            const isSelected = selectedIdx !== -1;
            const isVideo = item.mediaType === 'video';

            return (
              <TouchableOpacity
                style={[
                  styles.gridItem,
                  { width: gridItemSize, height: gridItemSize },
                  isSelected && styles.gridItemSelected,
                ]}
                onPress={() => handleSelectAsset(item)}
                activeOpacity={0.85}
              >
                <RNImage source={{ uri: item.uri }} style={styles.gridItemImage} />

                {/* Numbered selection badge */}
                {isSelected && (
                  <View style={styles.numberedBadge}>
                    <Text style={styles.numberedBadgeText}>{selectedIdx + 1}</Text>
                  </View>
                )}

                {/* Video duration badge */}
                {isVideo && (
                  <View style={styles.videoDurationBadge}>
                    <Text style={styles.videoDurationText}>
                      {item.duration ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}` : '0:00'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Album Selection Sheet */}
      <AlbumSheet
        visible={showAlbumSheet}
        albums={albums}
        selectedAlbumId={selectedAlbum.id}
        onSelectAlbum={handleSelectAlbum}
        onClose={() => setShowAlbumSheet(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  topBarTitle: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  skipBtnText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '500',
  },
  nextPill: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextPillDisabled: {
    backgroundColor: '#1C1C1E',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  nextPillText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  nextPillTextDisabled: {
    color: '#6E6E73',
  },
  previewStage: {
    width: '100%',
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  previewFrameWrapper: {
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  aspectRatioPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 10,
  },
  aspectRatioText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  soundPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  emptyPreview: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPreviewText: {
    color: '#71717A',
    fontSize: 14,
  },
  trayHeader: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  albumSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  albumSelectText: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  trayActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  multiSelectBtnActive: {
    backgroundColor: '#F5F5F5',
    borderColor: '#F5F5F5',
  },
  multiSelectText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '600',
  },
  multiSelectTextActive: {
    color: '#000000',
  },
  cameraIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    paddingBottom: 72,
  },
  gridItem: {
    margin: 1,
    position: 'relative',
    backgroundColor: '#161616',
    overflow: 'hidden',
  },
  gridItemSelected: {
    opacity: 0.9,
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
  },
  numberedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3,
  },
  numberedBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  permissionFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permText: {
    color: '#A1A1AA',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  permAllowBtn: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  permAllowText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '600',
  },
  permDeviceBtn: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  permDeviceText: {
    color: '#D1D5DB',
    fontSize: 13,
  },
});
