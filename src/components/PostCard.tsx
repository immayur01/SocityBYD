import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  TextInput,
  Animated,
  Modal,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import {
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  X,
  Send,
  RefreshCw,
} from 'lucide-react-native';
import { Post, PostComment, UserProfile } from '@/types';
import { postsService } from '@/services/posts';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface PostCardProps {
  post: Post;
  onLikeToggle?: (postId: string) => void;
  onToggleLike?: (postId: string) => void;
  darkMode?: boolean;
}

const WING_BUILDING_MAP: Record<string, string> = {
  'Wing A': 'Chintamani',
  'Wing B': 'Mayureshwar',
  'Wing C': 'Chintamani',
  'Wing D': 'Girijatmak',
  'Wing E': 'Vighnahar',
  'Wing F': 'Mahaganapati',
  'Wing G': 'Varadavinayak',
  'Wing H': 'Ballaleshwar',
  'Wing I': 'Chintamani',
  'Wing J': 'Mayureshwar',
  'Wing K': 'Siddhivinayak',
  'Wing L': 'Varadavinayak',
};

function getBuildingFlat(author?: UserProfile): string {
  if (!author) return 'Chintamani 303';
  const anyAuthor = author as any;
  if (anyAuthor.building) {
    return `${anyAuthor.building} ${author.flat_number || ''}`.trim();
  }
  const building = WING_BUILDING_MAP[author.wing] || 'Chintamani';
  return `${building} ${author.flat_number || ''}`.trim();
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const postTime = new Date(dateStr).getTime();
  const diffMs = Math.max(0, now - postTime);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins`;
  if (diffHours === 1) return '1 hour';
  if (diffHours < 24) return `${diffHours} hours`;
  if (diffDays === 1) return '1 day';
  return `${diffDays} days`;
}

function formatTime(millis: number): string {
  if (!millis || millis < 0 || isNaN(millis)) return '0:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function getAuthorInitials(name?: string): string {
  if (!name) return 'RS';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLikeToggle,
  onToggleLike,
}) => {
  const insets = useSafeAreaInsets();
  const { tokens, isDark } = useTheme();

  const [isLiked, setIsLiked] = useState(post.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Video playback & Fullscreen states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const feedVideoRef = useRef<Video>(null);
  const fullscreenVideoRef = useRef<Video>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Double-tap like animation
  const lastTapRef = useRef<number>(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  // Auto-hide controls in fullscreen after inactivity
  useEffect(() => {
    if (isFullscreen && showControls && isPlaying) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isFullscreen, showControls, isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handleShare = useCallback(async () => {
    try {
      const authorName = post.author?.full_name || 'Resident';
      const buildingFlat = getBuildingFlat(post.author);
      const content = post.content || '';
      await Share.share({
        title: 'Ashtavinayak Empire: Community Post',
        message: `[Ashtavinayak Empire]\n${authorName} (${buildingFlat}) posted:\n\n"${content}"\n\nShared via Ashtavinayak Empire App`,
      });
    } catch {
      // User cancelled or dismissed native share sheet
    }
  }, [post]);

  const triggerDoubleTapLike = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    if (!isLiked) {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);

      const toggleFn = onLikeToggle || onToggleLike;
      if (toggleFn) {
        toggleFn(post.id);
      } else {
        postsService.toggleLike(post.id);
      }
    }

    // Centered Heart Burst Animation
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.2,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 350,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleMediaPress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      triggerDoubleTapLike();
    }
    lastTapRef.current = now;
  };

  const handleLike = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    const toggleFn = onLikeToggle || onToggleLike;
    if (toggleFn) {
      toggleFn(post.id);
    } else {
      await postsService.toggleLike(post.id);
    }
  };

  const toggleCommentsDrawer = async () => {
    if (!showComments) {
      const data = await postsService.getComments(post.id);
      const uniqueComments = data.filter(
        (c, idx, arr) => arr.findIndex((item) => item.id === c.id) === idx
      );
      setComments(uniqueComments);
    }
    setShowComments((prev) => !prev);
  };

  const handleAddComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      const added = await postsService.addComment(post.id, trimmed);
      setComments((prev) => {
        if (prev.some((c) => c.id === added.id)) return prev;
        return [...prev, added];
      });
      setNewComment('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Fullscreen Handlers
  const handleOpenFullscreen = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setIsFullscreen(true);
    setShowControls(true);
    setIsPlaying(true);
  };

  const handleCloseFullscreen = async () => {
    if (fullscreenVideoRef.current && feedVideoRef.current) {
      try {
        await feedVideoRef.current.setPositionAsync(playbackPosition);
      } catch {}
    }
    setIsFullscreen(false);
  };

  const handleFeedPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      if (status.durationMillis) {
        setPlaybackDuration(status.durationMillis);
      }
    }
  };

  const handleFullscreenPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      if (status.durationMillis) {
        setPlaybackDuration(status.durationMillis);
      }
      setIsPlaying(status.isPlaying);
    }
  };

  const handleTogglePlay = async () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (fullscreenVideoRef.current) {
      if (nextState) {
        await fullscreenVideoRef.current.playAsync();
      } else {
        await fullscreenVideoRef.current.pauseAsync();
      }
    }
    setShowControls(true);
  };

  const handleRewind10 = async () => {
    const newPos = Math.max(0, playbackPosition - 10000);
    setPlaybackPosition(newPos);
    if (fullscreenVideoRef.current) {
      await fullscreenVideoRef.current.setPositionAsync(newPos);
    }
    setShowControls(true);
  };

  const handleForward10 = async () => {
    const maxDuration = playbackDuration > 0 ? playbackDuration : playbackPosition + 10000;
    const newPos = Math.min(maxDuration, playbackPosition + 10000);
    setPlaybackPosition(newPos);
    if (fullscreenVideoRef.current) {
      await fullscreenVideoRef.current.setPositionAsync(newPos);
    }
    setShowControls(true);
  };

  const handleProgressBarPress = async (e: any) => {
    if (trackWidth <= 0 || playbackDuration <= 0) return;
    const clickX = e.nativeEvent.locationX;
    const clampedX = Math.max(0, Math.min(clickX, trackWidth));
    const targetMillis = (clampedX / trackWidth) * playbackDuration;
    setPlaybackPosition(targetMillis);
    if (fullscreenVideoRef.current) {
      await fullscreenVideoRef.current.setPositionAsync(targetMillis);
    }
    setShowControls(true);
  };

  const isVideo = post.media_type === 'video';
  const buildingFlatText = getBuildingFlat(post.author);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.bgCard,
          borderColor: tokens.borderSubtle,
        },
        isDark ? styles.shadowDark : styles.shadowLight,
      ]}
    >
      {/* ============================================================
          1. CLEAN SINGLE-ROW POST HEADER
      ============================================================ */}
      <View style={styles.cardHeader}>
        <View style={styles.authorRow}>
          {post.author?.avatar_url ? (
            <Image
              source={{ uri: post.author.avatar_url }}
              style={[styles.avatarSquircle, { borderColor: tokens.borderSubtle }]}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatarSquircle, { backgroundColor: '#7C4DFF' }]}>
              <Text style={styles.avatarInitials}>
                {getAuthorInitials(post.author?.full_name)}
              </Text>
            </View>
          )}

          <Text
            style={[styles.authorName, { color: tokens.textPrimary }]}
            numberOfLines={1}
          >
            {post.author?.full_name || 'Society Resident'}
          </Text>
        </View>

        {/* Building + Flat Badge on far right */}
        <View
          style={[
            styles.flatBadge,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: tokens.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.flatBadgeText, { color: tokens.textSecondary }]}>
            {buildingFlatText}
          </Text>
        </View>
      </View>

      {/* ============================================================
          2. FEED MEDIA (4:5 COMPACT VIDEO / 1:1 PHOTO + FULLSCREEN TOGGLE)
      ============================================================ */}
      {post.media_url ? (
        <View style={styles.mediaContainerWrapper}>
          <Pressable
            onPress={handleMediaPress}
            style={[
              styles.mediaWrapper,
              {
                aspectRatio: isVideo ? 4 / 5 : 1,
                maxHeight: isVideo ? 440 : undefined,
                backgroundColor: isDark ? '#000000' : '#0B0E14',
                borderColor: tokens.borderSubtle,
              },
            ]}
          >
            {isVideo ? (
              <>
                <Video
                  ref={feedVideoRef}
                  source={{ uri: post.media_url }}
                  style={StyleSheet.absoluteFill}
                  resizeMode={ResizeMode.COVER}
                  isLooping
                  shouldPlay={!isFullscreen && !videoError}
                  isMuted={isMuted}
                  usePoster={true}
                  posterSource={{
                    uri:
                      post.poster_url ||
                      'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=800&auto=format&fit=crop&q=80',
                  }}
                  posterStyle={{ resizeMode: 'cover' }}
                  onError={() => setVideoError(true)}
                  onPlaybackStatusUpdate={handleFeedPlaybackStatusUpdate}
                />

                {videoError && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setVideoError(false)}
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10,
                      },
                    ]}
                  >
                    <RefreshCw size={26} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 8, fontWeight: '600' }}>
                      Tap to retry video
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Image
                source={{ uri: post.media_url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            )}

            {/* Video Floating Controls: Fullscreen Expand + Mute/Unmute */}
            {isVideo && (
              <View style={styles.floatingVideoControls}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleOpenFullscreen}
                  style={styles.circleControlBtn}
                >
                  <Maximize2 size={14} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsMuted((prev) => !prev)}
                  style={styles.circleControlBtn}
                >
                  {isMuted ? (
                    <VolumeX size={15} color="#FFFFFF" strokeWidth={2.2} />
                  ) : (
                    <Volume2 size={15} color="#FFFFFF" strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Double Tap Heart Burst Animated Overlay */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.heartBurstOverlay,
                {
                  opacity: heartOpacity,
                  transform: [{ scale: heartScale }],
                },
              ]}
            >
              <Heart size={82} color="#FFFFFF" fill="#EF4444" strokeWidth={1.5} />
            </Animated.View>
          </Pressable>
        </View>
      ) : null}

      {/* ============================================================
          3. STREAMLINED ACTION ROW & RELATIVE TIMESTAMP PILL
      ============================================================ */}
      <View style={styles.actionBar}>
        {/* Left Actions: Like, Comment, Paper-Plane Share */}
        <View style={styles.leftActions}>
          {/* Like Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <Heart
              size={22}
              color={isLiked ? '#FF3040' : tokens.textPrimary}
              fill={isLiked ? '#FF3040' : 'transparent'}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.actionCount,
                { color: isLiked ? '#FF3040' : tokens.textPrimary },
              ]}
            >
              {likesCount}
            </Text>
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={toggleCommentsDrawer}
            activeOpacity={0.7}
          >
            <MessageCircle
              size={22}
              color={tokens.textPrimary}
              strokeWidth={2}
            />
            <Text style={[styles.actionCount, { color: tokens.textPrimary }]}>
              {post.comments_count || comments.length || 0}
            </Text>
          </TouchableOpacity>

          {/* Paper-Plane Share Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Send size={20.5} color={tokens.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Right side: Relative Instagram-style timestamp pill */}
        <View
          style={[
            styles.relativeTimePill,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: tokens.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.relativeTimeText, { color: tokens.textMuted }]}>
            {getRelativeTime(post.created_at)}
          </Text>
        </View>
      </View>

      {/* ============================================================
          4. INLINE BOLD USERNAME + 2-LINE CLAMPED CAPTION WITH "... more"
      ============================================================ */}
      <View style={styles.captionContainer}>
        <Text
          style={[styles.captionText, { color: tokens.textSecondary }]}
          numberOfLines={isExpanded ? undefined : 2}
        >
          <Text style={[styles.captionUsername, { color: tokens.textPrimary }]}>
            {post.author?.full_name || 'Resident'}{'  '}
          </Text>
          {post.content}
        </Text>

        {post.content.length > 75 && (
          <TouchableOpacity
            onPress={() => setIsExpanded((prev) => !prev)}
            activeOpacity={0.7}
            style={styles.moreBtn}
          >
            <Text style={[styles.moreBtnText, { color: tokens.textMuted }]}>
              {isExpanded ? 'less' : '... more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ============================================================
          COMMENTS SECTION (EXPANDABLE)
      ============================================================ */}
      {showComments && (
        <View style={styles.commentsContainer}>
          <View
            style={[
              styles.commentsDivider,
              { backgroundColor: tokens.borderDivider },
            ]}
          />
          {comments.length === 0 ? (
            <Text style={[styles.noCommentsText, { color: tokens.textMuted }]}>
              No comments yet. Be the first to share your thoughts!
            </Text>
          ) : (
            comments.map((comm, idx) => (
              <View
                key={comm.id ? `${comm.id}-${idx}` : `comm-${idx}`}
                style={[
                  styles.commentBubble,
                  { backgroundColor: tokens.bgSurface },
                ]}
              >
                <Text style={[styles.commentAuthor, { color: tokens.accentPurple }]}>
                  {comm.user?.full_name}{' '}
                  <Text style={[styles.commentFlat, { color: tokens.textMuted }]}>
                    ({getBuildingFlat(comm.user)})
                  </Text>
                </Text>
                <Text style={[styles.commentBody, { color: tokens.textSecondary }]}>
                  {comm.comment}
                </Text>
              </View>
            ))
          )}

          {/* Comment input box */}
          <View style={styles.commentInputRow}>
            <TextInput
              style={[
                styles.commentInput,
                {
                  backgroundColor: tokens.bgApp,
                  borderColor: tokens.borderSubtle,
                  color: tokens.textPrimary,
                },
              ]}
              placeholder="Write a comment..."
              placeholderTextColor={tokens.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              editable={!isSubmittingComment}
            />
            <TouchableOpacity
              style={[
                styles.commentSendBtn,
                (!newComment.trim() || isSubmittingComment) && { opacity: 0.5 },
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || isSubmittingComment}
              activeOpacity={0.7}
            >
              <Send size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ============================================================
          FULLSCREEN VIDEO MODAL (9:16 / CONTAIN + TRANSPORT CONTROLS)
      ============================================================ */}
      {isVideo && isFullscreen && (
        <Modal
          visible={true}
          animationType="fade"
          onRequestClose={handleCloseFullscreen}
        >
          <View style={styles.fullscreenContainer}>

            {/* Video Player in CONTAIN mode */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowControls((prev) => !prev)}
            >
              <Video
                ref={fullscreenVideoRef}
                source={{ uri: post.media_url! }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay={isPlaying}
                isMuted={isMuted}
                positionMillis={playbackPosition}
                onPlaybackStatusUpdate={handleFullscreenPlaybackStatusUpdate}
              />
            </Pressable>

            {/* Overlay Controls */}
            {showControls && (
              <View
                pointerEvents="box-none"
                style={[
                  styles.fullscreenOverlay,
                  {
                    paddingTop: Math.max(insets.top + 10, 24),
                    paddingBottom: Math.max(insets.bottom + 16, 28),
                  },
                ]}
              >
                {/* Top Bar: Close on Left, Mute on Right */}
                <View style={styles.fullscreenTopBar}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleCloseFullscreen}
                    style={styles.fullscreenIconCircle}
                  >
                    <X size={20} color="#FFFFFF" strokeWidth={2.4} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsMuted((prev) => !prev)}
                    style={styles.fullscreenIconCircle}
                  >
                    {isMuted ? (
                      <VolumeX size={18} color="#FFFFFF" strokeWidth={2.2} />
                    ) : (
                      <Volume2 size={18} color="#FFFFFF" strokeWidth={2.2} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Center Transport Controls: -10s, Play/Pause, +10s */}
                <View style={styles.fullscreenCenterControls}>
                  {/* -10s Backward */}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={handleRewind10}
                    style={styles.transportBtn}
                  >
                    <RotateCcw size={26} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.transportSecText}>10</Text>
                  </TouchableOpacity>

                  {/* Play / Pause Button */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleTogglePlay}
                    style={styles.playPauseBtn}
                  >
                    {isPlaying ? (
                      <Pause size={30} color="#FFFFFF" fill="#FFFFFF" />
                    ) : (
                      <Play
                        size={30}
                        color="#FFFFFF"
                        fill="#FFFFFF"
                        style={{ marginLeft: 3 }}
                      />
                    )}
                  </TouchableOpacity>

                  {/* +10s Forward */}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={handleForward10}
                    style={styles.transportBtn}
                  >
                    <RotateCw size={26} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.transportSecText}>10</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom Bar: Scrubbable Progress Bar & Timestamp */}
                <View style={styles.fullscreenBottomBar}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>
                      {formatTime(playbackPosition)}
                    </Text>
                    <Text style={styles.timeText}>
                      {formatTime(playbackDuration)}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.progressTrackContainer}
                    onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                    onPress={handleProgressBarPress}
                  >
                    <View style={styles.progressTrackBg}>
                      <View
                        style={[
                          styles.progressTrackFill,
                          {
                            width: `${
                              playbackDuration > 0
                                ? Math.min(100, (playbackPosition / playbackDuration) * 100)
                                : 0
                            }%`,
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  shadowDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 4,
  },
  shadowLight: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  avatarSquircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
  },
  authorName: {
    fontSize: 14.5,
    fontWeight: '800',
    flexShrink: 1,
  },
  flatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  flatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mediaContainerWrapper: {
    paddingHorizontal: 12,
  },
  mediaWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  floatingVideoControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBurstOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  relativeTimePill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  relativeTimeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  captionContainer: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 14,
  },
  captionText: {
    fontSize: 13.5,
    lineHeight: 19.5,
  },
  captionUsername: {
    fontWeight: '800',
    fontSize: 13.5,
  },
  moreBtn: {
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  moreBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentsContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  commentsDivider: {
    height: 1,
    marginBottom: 10,
  },
  noCommentsText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  commentBubble: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  commentFlat: {
    fontSize: 10,
    fontWeight: '500',
  },
  commentBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
  },
  commentSendBtn: {
    backgroundColor: '#7C4DFF',
    borderRadius: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Fullscreen Modal Styles */
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullscreenIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  fullscreenCenterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  transportBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    position: 'relative',
  },
  transportSecText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    top: 22,
  },
  playPauseBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fullscreenBottomBar: {
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrackContainer: {
    height: 24,
    justifyContent: 'center',
  },
  progressTrackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  progressTrackFill: {
    height: '100%',
    backgroundColor: '#EC4899',
    borderRadius: 2,
  },
});
