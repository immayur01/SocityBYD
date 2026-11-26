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
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { island } from '@/context/IslandContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
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
  MoreHorizontal,
  Edit3,
  Trash2,
  CornerDownRight,
  Check,
  Copy,
  FileText,
  Calendar,
  MapPin,
  ArrowBigUp,
  Clock,
} from 'lucide-react-native';
import { Post, PostComment, CommentReply, UserProfile } from '@/types';
import { postsService } from '@/services/posts';
import { CURRENT_USER } from '@/services/mockData';
import { CommentsSkeletonList } from '@/components/FeedPostSkeleton';
import { ResidentAvatar } from '@/components/ResidentAvatar';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface PostCardProps {
  post: Post;
  onLikeToggle?: (postId: string) => void;
  onToggleLike?: (postId: string) => void;
  darkMode?: boolean;
}

function getBuildingFlat(author?: UserProfile): string {
  if (!author) return 'Wing B · 303';
  const wing = (author.wing || 'Wing B').trim();
  const rawFlat = (author.flat_number || '').trim();
  if (rawFlat) {
    return `${wing} · ${rawFlat}`;
  }
  return wing;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const postTime = new Date(dateStr).getTime();
  const diffMs = Math.max(0, now - postTime);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours === 1) return '1h ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  return `${diffDays}d ago`;
}

function getCountdownBadge(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const remainingMs = expiry - now;
  if (remainingMs <= 0) return 'Expired';
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  if (remainingHours > 0) {
    return `${remainingHours}h ${remainingMins}m left`;
  }
  return `${remainingMins}m left`;
}

function getCommentRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'now';
  const now = Date.now();
  const time = new Date(dateStr).getTime();
  const diffMs = Math.max(0, now - time);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w`;
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
  const { user } = useAuth();

  const [isLiked, setIsLiked] = useState(post.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsCount, setCommentsCount] = useState<number>(post.comments_count || 0);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [selectedCommentForAction, setSelectedCommentForAction] = useState<PostComment | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  // Fetch comments for accurate preview & count
  useEffect(() => {
    let isMounted = true;
    postsService.getComments(post.id).then((loaded) => {
      if (isMounted && loaded) {
        const uniqueComments = loaded.filter(
          (c, idx, arr) => arr.findIndex((item) => item.id === c.id) === idx
        );
        setComments(uniqueComments);
        if (uniqueComments.length > 0) {
          setCommentsCount(uniqueComments.length);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [post.id]);

  // Video playback & Fullscreen states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);

  const isVideo = post.media_type === 'video';

  const player = useVideoPlayer(isVideo ? post.media_url || null : null, (p) => {
    p.loop = true;
    p.muted = isMuted;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    const subTime = player.addListener('timeUpdate', (event) => {
      setPlaybackPosition(event.currentTime * 1000);
      if (player.duration) {
        setPlaybackDuration(player.duration * 1000);
      }
    });
    const subPlaying = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });
    const subStatus = player.addListener('statusChange', (event) => {
      if (event.status === 'error') {
        setVideoError(true);
      }
    });

    return () => {
      subTime.remove();
      subPlaying.remove();
      subStatus.remove();
    };
  }, [player]);

  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [player, isMuted]);

  // Double-tap like animation
  const lastTapRef = useRef<number>(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const handleShare = useCallback(async () => {
    try {
      const authorName = post.author?.full_name || 'Resident';
      const buildingFlat = getBuildingFlat(post.author);
      const content = post.content || '';
      const result = await Share.share({
        title: 'Ashtavinayak Empire: Community Post',
        message: `[Ashtavinayak Empire]\n${authorName} (${buildingFlat}) posted:\n\n"${content}"\n\nShared via Ashtavinayak Empire App`,
      });
      if (result.action === Share.sharedAction) {
        island.success('Post Shared');
      }
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

  // ============================================================
  // INSTAGRAM-STYLE COMMENTS HANDLERS
  // ============================================================
  const handleOpenComments = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setIsCommentsOpen(true);
    if (comments.length === 0) {
      setIsCommentsLoading(true);
    }
    try {
      const data = await postsService.getComments(post.id);
      const uniqueComments = data.filter(
        (c, idx, arr) => arr.findIndex((item) => item.id === c.id) === idx
      );
      setComments(uniqueComments);
      setCommentsCount(uniqueComments.length);
    } catch {
      // fallback
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const handleCloseComments = () => {
    setIsCommentsOpen(false);
    setReplyingTo(null);
    setEditingComment(null);
    setCommentInput('');
  };

  const handleSubmitComment = async () => {
    const trimmed = commentInput.trim();
    if (!trimmed || isSubmittingComment) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    try {
      setIsSubmittingComment(true);

      if (editingComment) {
        // 1. Edit existing comment
        const updated = await postsService.editComment(post.id, editingComment.id, trimmed);
        if (updated) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === editingComment.id ? { ...c, comment: trimmed, is_edited: true } : c
            )
          );
        }
        setEditingComment(null);
        setCommentInput('');
      } else if (replyingTo) {
        // 2. Add reply to parent comment
        const reply = await postsService.addReply(post.id, replyingTo.commentId, trimmed);
        if (reply) {
          setComments((prev) =>
            prev.map((c) => {
              if (c.id === replyingTo.commentId) {
                const existing = c.replies || [];
                if (existing.some((r) => r.id === reply.id)) {
                  return c;
                }
                return {
                  ...c,
                  replies: [...existing, reply],
                };
              }
              return c;
            })
          );
          setExpandedReplies((prev) => ({ ...prev, [replyingTo.commentId]: true }));
          setCommentsCount((prev) => prev + 1);
        }
        setReplyingTo(null);
        setCommentInput('');
      } else {
        // 3. New top-level comment
        const added = await postsService.addComment(post.id, trimmed);
        if (added) {
          setComments((prev) => {
            if (prev.some((c) => c.id === added.id)) {
              return prev;
            }
            return [...prev, added];
          });
          setCommentsCount((prev) => prev + 1);
        }
        setCommentInput('');
      }
    } catch {
      // fallback
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const nextLiked = !c.is_liked;
          return {
            ...c,
            is_liked: nextLiked,
            likes_count: nextLiked ? (c.likes_count || 0) + 1 : Math.max(0, (c.likes_count || 1) - 1),
          };
        }
        return c;
      })
    );
    await postsService.toggleCommentLike(post.id, commentId);
  };

  const handleToggleReplyLike = async (commentId: string, replyId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId && c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) => {
              if (r.id === replyId) {
                const nextLiked = !r.is_liked;
                return {
                  ...r,
                  is_liked: nextLiked,
                  likes_count: nextLiked
                    ? (r.likes_count || 0) + 1
                    : Math.max(0, (r.likes_count || 1) - 1),
                };
              }
              return r;
            }),
          };
        }
        return c;
      })
    );
    await postsService.toggleReplyLike(post.id, commentId, replyId);
  };

  const handleOpenActionMenu = (comm: PostComment) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setSelectedCommentForAction(comm);
    setIsActionMenuOpen(true);
  };

  const handleActionEdit = (comm: PostComment) => {
    setIsActionMenuOpen(false);
    setReplyingTo(null);
    setEditingComment({ id: comm.id, text: comm.comment });
    setCommentInput(comm.comment);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 150);
  };

  const handleActionDelete = (comm: PostComment) => {
    setIsActionMenuOpen(false);
    island.confirm({
      title: 'Delete Comment',
      description: 'Are you sure you want to delete this comment? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setComments((prev) => prev.filter((c) => c.id !== comm.id));
        setCommentsCount((prev) => Math.max(0, prev - 1));
        await postsService.deleteComment(post.id, comm.id);
        island.success('Comment Deleted');
      },
    });
  };

  const handleActionReply = (comm: PostComment) => {
    setIsActionMenuOpen(false);
    handleStartReply(comm);
  };

  const handleActionCopy = (comm: PostComment) => {
    setIsActionMenuOpen(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    island.success('Copied', 'Comment text copied to clipboard.');
  };

  const handleStartReply = (comm: PostComment) => {
    setEditingComment(null);
    setReplyingTo({
      commentId: comm.id,
      authorName: comm.user?.full_name || 'Resident',
    });
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 150);
  };

  const handleCancelEditOrReply = () => {
    setReplyingTo(null);
    setEditingComment(null);
    setCommentInput('');
  };

  const handleToggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleAddEmoji = (emoji: string) => {
    setCommentInput((prev) => prev + emoji);
  };

  // Fullscreen Handlers
  const handleOpenFullscreen = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setIsFullscreen(true);
    setShowControls(true);
    if (player && !player.playing) {
      player.play();
      setIsPlaying(true);
    }
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };

  const handleTogglePlay = () => {
    if (!player) return;
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
    setShowControls(true);
  };

  const handleRewind10 = () => {
    if (!player) return;
    player.seekBy(-10);
    setShowControls(true);
  };

  const handleForward10 = () => {
    if (!player) return;
    player.seekBy(10);
    setShowControls(true);
  };

  const handleProgressBarPress = (e: any) => {
    if (!player || trackWidth <= 0 || playbackDuration <= 0) return;
    const clickX = e.nativeEvent.locationX;
    const clampedX = Math.max(0, Math.min(clickX, trackWidth));
    const targetSeconds = (clampedX / trackWidth) * (playbackDuration / 1000);
    player.currentTime = targetSeconds;
    setPlaybackPosition(targetSeconds * 1000);
    setShowControls(true);
  };

  const latestComment = comments.length > 0 ? comments[comments.length - 1] : null;

  const renderCommentItem = ({ item }: { item: PostComment }) => {
    const isOwnComment = item.user_id === CURRENT_USER.id;
    const isCommentLiked = !!item.is_liked;
    const commentLikesCount = item.likes_count || 0;
    const hasReplies = item.replies && item.replies.length > 0;
    const isExpanded = !!expandedReplies[item.id];
    const flatStr = getBuildingFlat(item.user);

    return (
      <View style={styles.commentRowContainer}>
        <TouchableOpacity
          activeOpacity={0.88}
          onLongPress={() => handleOpenActionMenu(item)}
          delayLongPress={350}
          style={styles.commentMainRow}
        >
          {/* Avatar */}
          <ResidentAvatar
            name={item.user?.full_name}
            avatarUrl={item.user?.avatar_url}
            size={36}
            borderRadius={18}
            style={{ marginRight: 10, marginTop: 2 }}
          />

          {/* Details */}
          <View style={styles.commentContentCol}>
            <View style={styles.commentAuthorLine}>
              <Text style={[styles.commentAuthorName, { color: tokens.textPrimary }]}>
                {item.user?.full_name || 'Resident'}
              </Text>
              <Text style={[styles.commentFlatBadge, { color: tokens.textMuted }]}>
                · {flatStr}
              </Text>
              <Text style={[styles.commentTimeAgo, { color: tokens.textMuted }]}>
                {getCommentRelativeTime(item.created_at)}
              </Text>
              {item.is_edited && (
                <Text style={[styles.commentEditedTag, { color: tokens.textMuted }]}>
                  (edited)
                </Text>
              )}
            </View>

            <Text style={[styles.commentTextBody, { color: tokens.textSecondary }]}>
              {item.comment}
            </Text>

            <View style={styles.commentSubActionsRow}>
              <TouchableOpacity
                onPress={() => handleStartReply(item)}
                style={styles.replyBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.replyBtnText, { color: tokens.textMuted }]}>
                  Reply
                </Text>
              </TouchableOpacity>

              {isOwnComment && (
                <TouchableOpacity
                  onPress={() => handleOpenActionMenu(item)}
                  style={styles.moreOptionsBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <MoreHorizontal size={15} color={tokens.textMuted} strokeWidth={1.5} />
                </TouchableOpacity>
              )}
            </View>

            {hasReplies && (
              <TouchableOpacity
                onPress={() => handleToggleReplies(item.id)}
                style={styles.nestedRepliesToggleBtn}
                activeOpacity={0.7}
              >
                <View style={[styles.nestedRepliesLine, { backgroundColor: tokens.borderSubtle }]} />
                <Text style={[styles.nestedRepliesToggleText, { color: tokens.textMuted }]}>
                  {isExpanded
                    ? 'Hide replies'
                    : `View ${item.replies!.length} ${
                        item.replies!.length === 1 ? 'reply' : 'replies'
                      }`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Heart like */}
          <TouchableOpacity
            onPress={() => handleToggleCommentLike(item.id)}
            style={styles.commentLikeCol}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Heart
              size={14}
              color={isCommentLiked ? '#EF4444' : tokens.textMuted}
              fill={isCommentLiked ? '#EF4444' : 'transparent'}
              strokeWidth={1.5}
            />
            {commentLikesCount > 0 && (
              <Text
                style={[
                  styles.commentLikeCount,
                  { color: isCommentLiked ? '#EF4444' : tokens.textMuted },
                ]}
              >
                {commentLikesCount}
              </Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Nested Replies Thread */}
        {hasReplies && isExpanded && (
          <View style={styles.nestedRepliesContainer}>
            {item.replies!.map((reply) => {
              const isReplyLiked = !!reply.is_liked;
              const replyLikesCount = reply.likes_count || 0;
              const replyFlatStr = getBuildingFlat(reply.user);

              return (
                <View key={reply.id} style={styles.replyRow}>
                  <ResidentAvatar
                    name={reply.user?.full_name}
                    avatarUrl={reply.user?.avatar_url}
                    size={28}
                    borderRadius={14}
                    style={{ marginRight: 8, marginTop: 2 }}
                  />

                  <View style={styles.replyContentCol}>
                    <View style={styles.replyAuthorLine}>
                      <Text
                        style={[styles.replyAuthorName, { color: tokens.textPrimary }]}
                      >
                        {reply.user?.full_name || 'Resident'}
                      </Text>
                      <Text
                        style={[styles.commentFlatBadge, { color: tokens.textMuted }]}
                      >
                        · {replyFlatStr}
                      </Text>
                      <Text
                        style={[styles.commentTimeAgo, { color: tokens.textMuted }]}
                      >
                        {getCommentRelativeTime(reply.created_at)}
                      </Text>
                    </View>

                    <Text
                      style={[styles.replyTextBody, { color: tokens.textSecondary }]}
                    >
                      {reply.reply}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleStartReply(item)}
                      style={styles.replyBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={[styles.replyBtnText, { color: tokens.textMuted }]}>
                        Reply
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleToggleReplyLike(item.id, reply.id)}
                    style={styles.commentLikeCol}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Heart
                      size={12}
                      color={isReplyLiked ? '#EF4444' : tokens.textMuted}
                      fill={isReplyLiked ? '#EF4444' : 'transparent'}
                      strokeWidth={1.5}
                    />
                    {replyLikesCount > 0 && (
                      <Text
                        style={[
                          styles.replyLikeCount,
                          { color: isReplyLiked ? '#EF4444' : tokens.textMuted },
                        ]}
                      >
                        {replyLikesCount}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

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
          <ResidentAvatar
            name={post.author?.full_name}
            avatarUrl={post.author?.avatar_url}
            size={36}
            borderRadius={10}
            style={{ marginRight: 10 }}
          />

          <Text
            style={[styles.authorName, { color: tokens.textPrimary }]}
            numberOfLines={1}
          >
            {post.author?.full_name || 'Society Resident'}
          </Text>
        </View>

        {/* Building + Flat Provenance on far right */}
        <View style={styles.provenanceWrap}>
          {post.expires_at && getCountdownBadge(post.expires_at) ? (
            <View style={[styles.countdownPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', borderColor: tokens.borderSubtle }]}>
              <Clock size={11} color={tokens.textMuted} strokeWidth={1.5} />
              <Text style={[styles.countdownText, { color: tokens.textMuted }]}>
                {getCountdownBadge(post.expires_at)}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.provenanceText, { color: tokens.textMuted }]}>
            {buildingFlatText}
          </Text>
        </View>
      </View>

      {/* Optional Event / Announcement Title & Details */}
      {(post.title || post.event_date || post.event_location) ? (
        <View style={styles.eventInfoBanner}>
          {post.title ? (
            <Text style={[styles.postTitleText, { color: tokens.textPrimary }]}>
              {post.title}
            </Text>
          ) : null}

          {(post.event_date || post.event_location) ? (
            <View style={styles.eventMetaRow}>
              {post.event_date ? (
                <View style={styles.eventMetaItem}>
                  <Calendar size={13} strokeWidth={1.5} color={tokens.textMuted} />
                  <Text style={[styles.eventMetaText, { color: tokens.textSecondary }]}>
                    {post.event_date}
                  </Text>
                </View>
              ) : null}

              {post.event_location ? (
                <View style={styles.eventMetaItem}>
                  <MapPin size={13} strokeWidth={1.5} color={tokens.textMuted} />
                  <Text style={[styles.eventMetaText, { color: tokens.textSecondary }]}>
                    {post.event_location}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ============================================================
          2. FEED MEDIA (4:5 COMPACT VIDEO / 1:1 PHOTO / DOCUMENT CARD)
      ============================================================ */}
      {post.media_url ? (
        post.media_type === 'file' ? (
          <View style={styles.documentCardWrapper}>
            <View
              style={[
                styles.documentCard,
                {
                  backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                  borderColor: tokens.borderSubtle,
                },
              ]}
            >
              <View
                style={[
                  styles.documentIconBox,
                  { backgroundColor: isDark ? '#1C1C1E' : '#E4E4E7' },
                ]}
              >
                <FileText size={20} strokeWidth={1.5} color={tokens.textPrimary} />
              </View>
              <View style={styles.documentInfo}>
                <Text
                  style={[styles.documentName, { color: tokens.textPrimary }]}
                  numberOfLines={1}
                >
                  {post.file_name || 'Society Document / Circular'}
                </Text>
                {post.file_size ? (
                  <Text style={[styles.documentSize, { color: tokens.textMuted }]}>
                    {(post.file_size / (1024 * 1024)).toFixed(1)} MB
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : (
        <View style={styles.mediaContainerWrapper}>
          <Pressable
            onPress={handleMediaPress}
            style={[
              styles.mediaWrapper,
              {
                aspectRatio: isVideo ? 4 / 5 : 1,
                maxHeight: isVideo ? 440 : undefined,
                backgroundColor: isDark ? '#000000' : '#F4F4F5',
                borderColor: tokens.borderSubtle,
              },
            ]}
          >
            {isVideo ? (
              <>
                <VideoView
                  player={player}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  nativeControls={false}
                />

                {videoError && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setVideoError(false);
                      player?.replay();
                    }}
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
                    <RefreshCw size={24} color="#FFFFFF" strokeWidth={1.5} />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 8, fontWeight: '500' }}>
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
                  <Maximize2 size={14} color="#FFFFFF" strokeWidth={1.5} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsMuted((prev) => !prev)}
                  style={styles.circleControlBtn}
                >
                  {isMuted ? (
                    <VolumeX size={15} color="#FFFFFF" strokeWidth={1.5} />
                  ) : (
                    <Volume2 size={15} color="#FFFFFF" strokeWidth={1.5} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Double Tap Upvote Burst Animated Overlay */}
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
              <ArrowBigUp size={64} color="#FFFFFF" fill="#10B981" strokeWidth={1.5} />
            </Animated.View>
          </Pressable>
        </View>
        )
      ) : null}

      {/* ============================================================
          3. STREAMLINED ACTION ROW & RELATIVE TIMESTAMP
      ============================================================ */}
      <View style={styles.actionBar}>
        {/* Left Actions: Upvote, Comment, Paper-Plane Share */}
        <View style={styles.leftActions}>
          {/* Upvote Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <ArrowBigUp
              size={22}
              color={isLiked ? '#10B981' : tokens.textPrimary}
              fill={isLiked ? '#10B981' : 'transparent'}
              strokeWidth={1.5}
            />
            <Text
              style={[
                styles.actionCount,
                { color: isLiked ? '#10B981' : tokens.textSecondary, fontWeight: isLiked ? '700' : '500' },
              ]}
            >
              {likesCount}
            </Text>
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleOpenComments}
            activeOpacity={0.7}
          >
            <MessageCircle
              size={20}
              color={tokens.textPrimary}
              strokeWidth={1.5}
            />
            <Text style={[styles.actionCount, { color: tokens.textSecondary }]}>
              {commentsCount}
            </Text>
          </TouchableOpacity>

          {/* Paper-Plane Share Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Send size={18} color={tokens.textPrimary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        {/* Right side: Quiet inline relative timestamp */}
        <Text style={[styles.relativeTimeText, { color: tokens.textMuted }]}>
          {getRelativeTime(post.created_at)}
        </Text>
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
          5. INSTAGRAM-STYLE COMPACT COMMENTS PREVIEW (NO INLINE BLOAT)
      ============================================================ */}
      {commentsCount > 0 && (
        <View style={styles.feedCommentsPreview}>
          {latestComment && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenComments}
              style={styles.latestCommentRow}
            >
              <Text
                style={[styles.latestCommentText, { color: tokens.textSecondary }]}
                numberOfLines={1}
              >
                <Text style={[styles.latestCommentUser, { color: tokens.textPrimary }]}>
                  {latestComment.user?.full_name || 'Resident'}{'  '}
                </Text>
                {latestComment.comment}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenComments}
            style={styles.viewAllCommentsBtn}
          >
            <Text style={[styles.viewAllCommentsText, { color: tokens.textMuted }]}>
              View all {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
            </Text>
          </TouchableOpacity>
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

            {/* 1. Video Player in CONTAIN mode */}
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              nativeControls={false}
            />

            {/* 2. Full-Screen Tap Layer to Toggle Controls */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowControls((prev) => !prev)}
            />

            {/* 3. Always-Accessible Floating Close Button when controls are hidden */}
            {!showControls && (
              <View
                pointerEvents="box-none"
                style={[
                  styles.alwaysCloseBar,
                  { paddingTop: Math.max(insets.top + 10, 24) },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleCloseFullscreen}
                  style={styles.fullscreenIconCircle}
                >
                  <X size={20} color="#FFFFFF" strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
            )}

            {/* 4. Overlay Controls */}
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
                    <X size={20} color="#FFFFFF" strokeWidth={1.5} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsMuted((prev) => !prev)}
                    style={styles.fullscreenIconCircle}
                  >
                    {isMuted ? (
                      <VolumeX size={18} color="#FFFFFF" strokeWidth={1.5} />
                    ) : (
                      <Volume2 size={18} color="#FFFFFF" strokeWidth={1.5} />
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
                    <RotateCcw size={26} color="#FFFFFF" strokeWidth={1.5} />
                    <Text style={styles.transportSecText}>10</Text>
                  </TouchableOpacity>

                  {/* Play / Pause Button */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleTogglePlay}
                    style={styles.playPauseBtn}
                  >
                    {isPlaying ? (
                      <Pause size={30} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.5} />
                    ) : (
                      <Play
                        size={30}
                        color="#FFFFFF"
                        fill="#FFFFFF"
                        strokeWidth={1.5}
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
                    <RotateCw size={26} color="#FFFFFF" strokeWidth={1.5} />
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

      {/* ============================================================
          INSTAGRAM-STYLE COMMENTS BOTTOM SHEET MODAL
      ============================================================ */}
      {isCommentsOpen && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseComments}
        >
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseComments} />

          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: isDark ? '#121214' : '#FFFFFF',
              },
            ]}
          >
            {/* Centered Drag Handle */}
            <View style={styles.sheetHandleWrapper}>
              <View
                style={[
                  styles.sheetHandle,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(0, 0, 0, 0.18)',
                  },
                ]}
              />
            </View>

            {/* Header: Title + Count Badge + Close Button */}
            <View
              style={[
                styles.sheetHeader,
                { borderBottomColor: tokens.borderDivider },
              ]}
            >
              <View style={styles.sheetHeaderCenter}>
                <Text style={[styles.sheetTitle, { color: tokens.textPrimary }]}>
                  Comments
                </Text>
                <View
                  style={[
                    styles.sheetCountBadge,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.05)',
                    },
                  ]}
                >
                  <Text style={[styles.sheetCountText, { color: tokens.textMuted }]}>
                    {commentsCount}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCloseComments}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={tokens.textPrimary} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Comment List */}
            {isCommentsLoading ? (
              <CommentsSkeletonList count={4} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={renderCommentItem}
                contentContainerStyle={styles.commentListContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyCommentsContainer}>
                    <MessageCircle size={36} color={tokens.textMuted} strokeWidth={1.5} />
                    <Text style={[styles.emptyCommentsTitle, { color: tokens.textPrimary }]}>
                      No comments yet
                    </Text>
                    <Text style={[styles.emptyCommentsSubtitle, { color: tokens.textMuted }]}>
                      Start the conversation and share your thoughts.
                    </Text>
                  </View>
                }
              />
            )}

            {/* Sticky Bottom Comment Composer + KeyboardAvoidingView */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 14 : 0}
            >
              {/* Quick-tap Emoji Reaction Strip */}
              <View
                style={[
                  styles.emojiBar,
                  {
                    backgroundColor: isDark ? '#161616' : '#F8FAFC',
                    borderTopColor: tokens.borderSubtle,
                  },
                ]}
              >
                {['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleAddEmoji(emoji)}
                    style={styles.emojiBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Replying or Editing Banner */}
              {(editingComment || replyingTo) && (
                <View
                  style={[
                    styles.composerBanner,
                    {
                      backgroundColor: isDark ? '#161616' : '#F1F5F9',
                      borderTopColor: tokens.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.composerBannerLeft}>
                    {editingComment ? (
                      <Edit3 size={13} color={tokens.textSecondary} strokeWidth={1.5} />
                    ) : (
                      <CornerDownRight size={13} color={tokens.textSecondary} strokeWidth={1.5} />
                    )}
                    <Text
                      style={[styles.composerBannerText, { color: tokens.textSecondary }]}
                      numberOfLines={1}
                    >
                      {editingComment ? (
                        'Editing your comment'
                      ) : (
                        <>
                          Replying to{' '}
                          <Text style={{ fontWeight: '600', color: tokens.textPrimary }}>
                            @{replyingTo?.authorName}
                          </Text>
                        </>
                      )}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleCancelEditOrReply}
                    style={styles.composerBannerCancel}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={15} color={tokens.textMuted} strokeWidth={1.5} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Bottom Input Composer Bar */}
              <View
                style={[
                  styles.composerInputRow,
                  {
                    backgroundColor: isDark ? '#121214' : '#FFFFFF',
                    borderTopColor: tokens.borderDivider,
                    paddingBottom: Math.max(insets.bottom, 10),
                  },
                ]}
              >
                <ResidentAvatar
                  name={user?.full_name || CURRENT_USER.full_name}
                  avatarUrl={user?.avatar_url || CURRENT_USER.avatar_url}
                  size={32}
                  borderRadius={16}
                  style={{ marginRight: 10 }}
                />

                <TextInput
                  ref={commentInputRef}
                  style={[
                    styles.composerTextInput,
                    {
                      backgroundColor: isDark ? '#18181B' : '#F4F4F5',
                      color: tokens.textPrimary,
                      borderColor: tokens.borderSubtle,
                    },
                  ]}
                  placeholder={
                    editingComment
                      ? 'Edit your comment...'
                      : replyingTo
                      ? `Reply to @${replyingTo.authorName}...`
                      : 'Add a comment...'
                  }
                  placeholderTextColor={tokens.textMuted}
                  value={commentInput}
                  onChangeText={setCommentInput}
                  multiline
                  maxLength={500}
                />

                <TouchableOpacity
                  style={[
                    styles.composerSendBtn,
                    { backgroundColor: isDark ? '#FFFFFF' : '#09090B' },
                    (!commentInput.trim() || isSubmittingComment) && styles.composerSendBtnDisabled,
                  ]}
                  onPress={handleSubmitComment}
                  disabled={!commentInput.trim() || isSubmittingComment}
                  activeOpacity={0.75}
                >
                  {editingComment ? (
                    <Check size={16} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={1.5} />
                  ) : (
                    <Send size={15} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={1.5} />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
      )}

      {/* ============================================================
          COMMENT ACTION MENU MODAL (EDIT, DELETE, REPLY, COPY)
      ============================================================ */}
      {isActionMenuOpen && selectedCommentForAction && (
        <Modal
          transparent
          visible={true}
          animationType="fade"
          onRequestClose={() => setIsActionMenuOpen(false)}
        >
          <Pressable
            style={styles.actionMenuBackdrop}
            onPress={() => setIsActionMenuOpen(false)}
          >
            <View
              style={[
                styles.actionMenuCard,
                {
                  backgroundColor: isDark ? '#111111' : '#FFFFFF',
                  borderColor: tokens.borderSubtle,
                  paddingBottom: Math.max(insets.bottom, 16),
                },
              ]}
            >
              <View style={styles.actionMenuHandle} />

              <Text
                style={[styles.actionMenuQuote, { color: tokens.textMuted }]}
                numberOfLines={2}
              >
                "{selectedCommentForAction.comment}"
              </Text>

              <View
                style={[
                  styles.actionMenuDivider,
                  { backgroundColor: tokens.borderDivider },
                ]}
              />

              {/* If Own Comment: Show Edit and Delete */}
              {selectedCommentForAction.user_id === CURRENT_USER.id && (
                <>
                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={() => handleActionEdit(selectedCommentForAction)}
                  >
                    <View
                      style={[
                        styles.actionMenuIconWrap,
                        {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : '#F1F5F9',
                        },
                      ]}
                    >
                      <Edit3 size={16} color={tokens.textPrimary} strokeWidth={1.5} />
                    </View>
                    <Text
                      style={[styles.actionMenuLabel, { color: tokens.textPrimary }]}
                    >
                      Edit Comment
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionMenuItem}
                    onPress={() => handleActionDelete(selectedCommentForAction)}
                  >
                    <View
                      style={[
                        styles.actionMenuIconWrap,
                        { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                      ]}
                    >
                      <Trash2 size={16} color="#EF4444" strokeWidth={1.5} />
                    </View>
                    <Text
                      style={[styles.actionMenuLabel, { color: '#EF4444', fontWeight: '500' }]}
                    >
                      Delete Comment
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Available for any comment: Reply & Copy */}
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleActionReply(selectedCommentForAction)}
              >
                <View
                  style={[
                    styles.actionMenuIconWrap,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : '#F1F5F9',
                    },
                  ]}
                >
                  <CornerDownRight
                    size={16}
                    color={tokens.textPrimary}
                    strokeWidth={1.5}
                  />
                </View>
                <Text
                  style={[styles.actionMenuLabel, { color: tokens.textPrimary }]}
                >
                  Reply to Resident
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleActionCopy(selectedCommentForAction)}
              >
                <View
                  style={[
                    styles.actionMenuIconWrap,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : '#F1F5F9',
                    },
                  ]}
                >
                  <Copy size={16} color={tokens.textPrimary} strokeWidth={1.5} />
                </View>
                <Text
                  style={[styles.actionMenuLabel, { color: tokens.textPrimary }]}
                >
                  Copy Comment Text
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  shadowDark: {
    shadowOpacity: 0,
    elevation: 0,
  },
  shadowLight: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 10,
  },
  avatarSquircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '600',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  provenanceWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  countdownText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  provenanceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventInfoBanner: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  postTitleText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  eventMetaRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  documentCardWrapper: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  documentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
    gap: 2,
  },
  documentName: {
    fontSize: 13,
    fontWeight: '500',
  },
  documentSize: {
    fontSize: 11,
  },
  mediaContainerWrapper: {
    paddingHorizontal: 12,
  },
  mediaWrapper: {
    width: '100%',
    borderRadius: 8,
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  relativeTimeText: {
    fontSize: 12,
    fontWeight: '400',
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: '600',
    fontSize: 14,
  },
  moreBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  moreBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  /* Compact Feed Comments Preview */
  feedCommentsPreview: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 12,
    gap: 4,
  },
  latestCommentRow: {
    marginBottom: 2,
  },
  latestCommentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  latestCommentUser: {
    fontWeight: '600',
    fontSize: 13,
  },
  viewAllCommentsBtn: {
    paddingTop: 2,
    alignSelf: 'flex-start',
  },
  viewAllCommentsText: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* Instagram-Style Comments Bottom Sheet */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '74%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetHandleWrapper: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
  },
  sheetCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sheetCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sheetCloseBtn: {
    padding: 4,
  },
  commentListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyCommentsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyCommentsSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },

  /* Comment Row Styles */
  commentRowContainer: {
    marginBottom: 16,
  },
  commentMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginTop: 2,
  },
  commentAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  commentAvatarInitials: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentContentCol: {
    flex: 1,
    gap: 3,
  },
  commentAuthorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  commentFlatBadge: {
    fontSize: 12,
    fontWeight: '400',
  },
  commentTimeAgo: {
    fontSize: 12,
    fontWeight: '400',
  },
  commentEditedTag: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  commentTextBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  commentSubActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  replyBtn: {
    paddingVertical: 2,
  },
  replyBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreOptionsBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  nestedRepliesToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 2,
  },
  nestedRepliesLine: {
    width: 24,
    height: 1,
  },
  nestedRepliesToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  commentLikeCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingLeft: 4,
    gap: 2,
    minWidth: 26,
  },
  commentLikeCount: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* Nested Replies */
  nestedRepliesContainer: {
    marginLeft: 36,
    paddingLeft: 12,
    marginTop: 10,
    gap: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.12)',
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginTop: 2,
  },
  replyAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  replyAvatarInitials: {
    fontSize: 10,
    fontWeight: '600',
  },
  replyContentCol: {
    flex: 1,
    gap: 2,
  },
  replyAuthorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  replyAuthorName: {
    fontSize: 12,
    fontWeight: '600',
  },
  replyTextBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  replyLikeCount: {
    fontSize: 10,
    fontWeight: '500',
  },

  /* Composer & Emoji Bar */
  emojiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  emojiBtn: {
    padding: 6,
  },
  emojiText: {
    fontSize: 20,
  },
  composerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  composerBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  composerBannerCancel: {
    padding: 4,
  },
  composerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  composerTextInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 96,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
  },
  composerSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerSendBtnDisabled: {
    opacity: 0.35,
  },

  /* Action Menu Modal */
  actionMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  actionMenuCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  actionMenuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  actionMenuQuote: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  actionMenuDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  actionMenuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  /* Fullscreen Modal Styles */
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  alwaysCloseBar: {
    position: 'absolute',
    top: 0,
    left: 16,
    zIndex: 25,
  },
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullscreenIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontWeight: '700',
    top: 22,
  },
  playPauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
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
    fontWeight: '500',
  },
  progressTrackContainer: {
    height: 24,
    justifyContent: 'center',
  },
  progressTrackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  progressTrackFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});
