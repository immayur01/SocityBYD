import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Platform,
  Modal,
  StyleSheet,
  BackHandler,
  Image,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  Bell,
  Plus,
  Search,
  Send,
  Smile,
  Paperclip,
  Camera,
  CheckCheck,
  Users,
  MessageSquare,
  Megaphone,
  Pin,
  Heart,
  MessageCircle,
  ShieldCheck,
  Utensils,
  Sparkles,
  Building2,
  X,
  ChevronRight,
  Lock,
  Home,
  UserCheck,
  EyeOff,
  Check,
  UserPlus,
  Clock,
  FileText,
  Inbox,
} from 'lucide-react-native';
import { UnreadBadge, formatBadgeCount } from '@/components/UnreadBadge';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chat';
import { isSupabaseConfigured } from '@/services/supabase';

// Enable LayoutAnimation for smooth WhatsApp-style thread reordering on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// WhatsApp-style smooth layout transition helper
const animateLayoutTransition = () => {
  try {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  } catch {
    // Graceful fallback
  }
};

// Generic WhatsApp-style recency sort helper (descending by lastMessageAt)
const sortByMostRecent = <T extends { lastMessageAt?: number }>(items: T[]): T[] => {
  return [...items].sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
};

// Suppress unused import warnings for icon-only imports
void Pin; void Heart; void MessageCircle; void UserCheck;

const POPULAR_EMOJIS = [
  '👍', '🙏', '❤️', '😂', '🎉', '😊', '🔥', '👏',
  '✨', '👌', '🤝', '🌸', '🪔', '🏢', '🏠', '🥳',
  '💯', '🤩', '😎', '☕', '🍛', '🍰', '🚗', '🛵',
  '📦', '🔔', '📢', '🛡️', '⚡', '💧', '🔑', '🙌',
  '😍', '🥰', '😘', '😆', '😅', '🤣', '😇', '🙂',
  '😉', '😌', '💪', '🫶', '💙', '💜', '🌟', '💫',
];

interface ResidentMember {
  id: string;
  name: string;
  building: string;
  flat: string;
  role: string;
  phone: string; // Stored for exact 10-digit search only; never rendered in UI
  dob: string;   // Strictly hidden from UI
  online: boolean;
  avatarColor: string;
  initials: string;
}

interface ChatAttachment {
  type: 'image' | 'file';
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  flat?: string;
  text: string;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
  reactions: Record<string, number>;
  userReacted: string[];
  attachment?: ChatAttachment;
}

interface ChannelGroup {
  id: string;
  name: string;
  subtitle: string;
  isWingGroup?: boolean;
  readOnly: boolean;
  unread: number;
  lastTime: string;
  lastMessageAt?: number;
  iconType: 'wing' | 'megaphone' | 'building' | 'food' | 'sparkles';
  accentBg: string;
  accentColor: string;
  messages: ChatMessage[];
}

interface DmThread {
  id: string;
  resident: ResidentMember;
  requestState: 'accepted' | 'pending_sent';
  unread: number;
  lastTime: string;
  lastMessageAt: number;
  messages: ChatMessage[];
}

interface DmRequestItem {
  id: string;
  resident: ResidentMember;
  introMessage: string;
  time: string;
}

interface NotificationItem {
  id: string;
  category: 'pinned' | 'activity';
  title: string;
  body: string;
  time: string;
  unread: boolean;
  actorInitials: string;
  actorBg: string;
  badgeType: 'pin' | 'heart' | 'comment' | 'shield';
}

const SOCIETY_MEMBERS_DB: ResidentMember[] = [
  {
    id: 'r1',
    name: 'Rajesh Sharma',
    building: 'Siddhivinayak',
    flat: '101',
    role: 'Secretary',
    phone: '9822011101',
    dob: '1978-04-14',
    online: true,
    avatarColor: '#18181B',
    initials: 'RS',
  },
  {
    id: 'r2',
    name: 'Sunita Deshmukh',
    building: 'Ballaleshwar',
    flat: '304',
    role: 'Resident',
    phone: '9822022304',
    dob: '1984-09-22',
    online: true,
    avatarColor: '#18181B',
    initials: 'SD',
  },
  {
    id: 'r3',
    name: 'Pooja Kulkarni',
    building: 'Varadavinayak',
    flat: '201',
    role: 'Resident',
    phone: '9822033201',
    dob: '1991-11-05',
    online: false,
    avatarColor: '#18181B',
    initials: 'PK',
  },
  {
    id: 'r4',
    name: 'Vikram Joshi',
    building: 'Chintamani',
    flat: '202',
    role: 'Wing Coordinator',
    phone: '9822044202',
    dob: '1987-02-19',
    online: true,
    avatarColor: '#18181B',
    initials: 'VJ',
  },
  {
    id: 'r5',
    name: 'Neha Patil',
    building: 'Chintamani',
    flat: '401',
    role: 'Owner',
    phone: '9822055401',
    dob: '1993-07-30',
    online: false,
    avatarColor: '#18181B',
    initials: 'NP',
  },
  {
    id: 'r6',
    name: 'Sandeep Gokhale',
    building: 'Chintamani',
    flat: '104',
    role: 'Owner',
    phone: '9822066104',
    dob: '1981-12-11',
    online: true,
    avatarColor: '#18181B',
    initials: 'SG',
  },
  {
    id: 'r7',
    name: 'Ananya Deshpande',
    building: 'Mayureshwar',
    flat: '302',
    role: 'Resident',
    phone: '9822077302',
    dob: '1995-06-18',
    online: true,
    avatarColor: '#18181B',
    initials: 'AD',
  },
];

const createWingGroupData = (buildingName: string, userFlat: string): ChannelGroup => ({
  id: `wing-${buildingName.toLowerCase()}`,
  name: `${buildingName} Wing Group`,
  subtitle: `16 Flats • ${buildingName} (${userFlat})`,
  isWingGroup: true,
  readOnly: false,
  unread: 1,
  lastTime: '10:24 AM',
  lastMessageAt: Date.now() - 1000 * 60 * 5,
  iconType: 'wing',
  accentBg: '#18181B',
  accentColor: '#E4E4E7',
  messages: [
    {
      id: `${buildingName}-w1`,
      senderId: 'r4',
      senderName: 'Vikram Joshi',
      flat: '202 • Wing Rep',
      text: `Welcome to ${buildingName} Wing Group! Only residents of our 16 flats (101 to 404) are in this group for wing maintenance, lift updates, and daily coordination.`,
      time: '9:15 AM',
      reactions: { '🙏': 7, '👍': 5 },
      userReacted: ['👍'],
    },
    {
      id: `${buildingName}-w2`,
      senderId: 'r5',
      senderName: 'Neha Patil',
      flat: '401 • Owner',
      text: 'Good morning neighbors! Terrace overhead water tank valve has been serviced. Water pressure on 3rd and 4th floor should be back to normal now.',
      time: '10:24 AM',
      reactions: { '👍': 4 },
      userReacted: [],
    },
  ],
});

const INITIAL_UNIVERSAL_CHANNELS: ChannelGroup[] = [
  {
    id: 'comm-general',
    name: 'Ashtavinayak General',
    subtitle: 'All 11 Buildings • 148 Active Residents',
    readOnly: false,
    unread: 0,
    lastTime: '10:10 PM',
    iconType: 'building',
    accentBg: '#18181B',
    accentColor: '#E4E4E7',
    messages: [
      {
        id: 'g-1',
        senderId: 'r1',
        senderName: 'Rajesh Sharma',
        flat: 'Siddhivinayak 101',
        text: '📢 Warm greetings to all residents across all 11 wings! Please ensure visitor entries are validated via the gate intercom.',
        time: '5:45 PM',
        reactions: { '🙏': 3, '👍': 4 },
        userReacted: ['🙏'],
      },
      {
        id: 'g-2',
        senderId: 'r3',
        senderName: 'Pooja Kulkarni',
        flat: 'Varadavinayak 201',
        text: 'Has anyone found a set of brass keys with a blue Ganesh keychain near the clubhouse garden? Dropped them during my morning jog today.',
        time: '9:35 PM',
        reactions: { '🙏': 2 },
        userReacted: [],
      },
      {
        id: 'g-3',
        senderId: 'me',
        senderName: 'You',
        flat: 'Chintamani 303',
        text: 'Yes Pooja ji! Security gate #1 has them deposited in the lost & found register. You can collect it from security guard Shivaji.',
        time: '10:10 PM',
        status: 'read',
        reactions: { '🙏': 1, '❤️': 1 },
        userReacted: [],
      },
    ],
  },
  {
    id: 'comm-announcements',
    name: 'Announcements',
    subtitle: 'Admin Broadcast • Only Admins can post',
    readOnly: true,
    unread: 1,
    lastTime: '10:15 AM',
    iconType: 'megaphone',
    accentBg: '#18181B',
    accentColor: '#E4E4E7',
    messages: [
      {
        id: 'ann-1',
        senderId: 'r1',
        senderName: 'Rajesh Sharma',
        flat: 'Siddhivinayak 101 • Admin',
        text: '📢 PINNED NOTICE • AGM MEETING: Sunday 10:30 AM in Clubhouse regarding Solar Rooftop & CCTV Upgrades. All 11 buildings are requested to attend.',
        time: '10:15 AM',
        reactions: { '🙏': 24, '👍': 31 },
        userReacted: ['👍'],
      },
    ],
  },
  {
    id: 'comm-food',
    name: 'Buy, Sell & Food Corner',
    subtitle: 'Sunita Deshmukh: Fresh organic Puran Poli...',
    readOnly: false,
    unread: 2,
    lastTime: '7:45 PM',
    iconType: 'food',
    accentBg: '#18181B',
    accentColor: '#E4E4E7',
    messages: [
      {
        id: 'f-1',
        senderId: 'r2',
        senderName: 'Sunita Deshmukh',
        flat: 'Ballaleshwar 304',
        text: 'Hello neighbors! Fresh organic Puran Poli & Modak are available in the Food Corner today. Homemade with pure cow ghee. Limited portions available! 🪔😋',
        time: '7:45 PM',
        reactions: { '❤️': 6, '🎉': 4, '👍': 5 },
        userReacted: ['❤️'],
      },
    ],
  },
  {
    id: 'comm-cultural',
    name: 'Cultural & Festival Committee',
    subtitle: 'Vikram Joshi: Stage decoration rehearsal at 7 PM',
    readOnly: false,
    unread: 0,
    lastTime: 'Yesterday',
    iconType: 'sparkles',
    accentBg: '#18181B',
    accentColor: '#E4E4E7',
    messages: [
      {
        id: 'c-1',
        senderId: 'r4',
        senderName: 'Vikram Joshi',
        flat: 'Chintamani 202',
        text: 'Hi everyone! Kids dance practice for the upcoming cultural evening starts at 7:00 PM in the Clubhouse hall.',
        time: 'Yesterday',
        reactions: { '🎉': 8, '👍': 5 },
        userReacted: [],
      },
    ],
  },
];

const INITIAL_DMS: DmThread[] = [
  {
    id: 'dm-r3',
    resident: SOCIETY_MEMBERS_DB[2],
    requestState: 'accepted',
    unread: 2,
    lastTime: '10:12 PM',
    lastMessageAt: Date.now() - 1000 * 60 * 15, // 15 mins ago
    messages: [
      {
        id: 'dm1-1',
        senderId: 'r3',
        text: 'Thank you so much Aarav ji! Just collected the keys from Shivaji at Gate #1 🙏',
        time: '10:11 PM',
        reactions: { '🙏': 1 },
        userReacted: ['🙏'],
      },
      {
        id: 'dm1-2',
        senderId: 'r3',
        text: 'Really saved me a lot of trouble tonight!',
        time: '10:12 PM',
        reactions: {},
        userReacted: [],
      },
    ],
  },
  {
    id: 'dm-r2',
    resident: SOCIETY_MEMBERS_DB[1],
    requestState: 'accepted',
    unread: 1,
    lastTime: '8:05 PM',
    lastMessageAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    messages: [
      {
        id: 'dm2-1',
        senderId: 'me',
        text: 'Hi Sunita ji, please reserve 2 plates of Puran Poli for Chintamani 303.',
        time: '7:52 PM',
        status: 'read',
        reactions: {},
        userReacted: [],
      },
      {
        id: 'dm2-2',
        senderId: 'r2',
        text: 'Noted Aarav! Fresh batch will be ready by 8:30 PM. You can pick it up anytime.',
        time: '8:05 PM',
        reactions: { '👍': 1 },
        userReacted: ['👍'],
      },
    ],
  },
];

const INITIAL_DM_REQUESTS: DmRequestItem[] = [
  {
    id: 'req-r7',
    resident: SOCIETY_MEMBERS_DB[6],
    introMessage:
      'Hi Aarav! Saw your comment on the Cultural Committee post. Would love to coordinate on the weekend badminton tournament.',
    time: '12:15 PM',
  },
  {
    id: 'req-r6',
    resident: SOCIETY_MEMBERS_DB[5],
    introMessage:
      'Namaste Aarav ji, I am Sandeep from Chintamani 104. Wanted to check if your parking slot is free tomorrow afternoon for a family guest?',
    time: '11:30 AM',
  },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    category: 'pinned',
    title: 'Pinned Notice • AGM Meeting',
    body: 'Sunday 10:30 AM in Clubhouse: Solar Rooftop & CCTV Upgrades. Pinned by Rajesh Sharma (Siddhivinayak 101).',
    time: '15m ago',
    unread: true,
    actorInitials: 'RS',
    actorBg: '#D97706',
    badgeType: 'pin',
  },
  {
    id: 'n2',
    category: 'activity',
    title: 'Pooja Kulkarni (Varadavinayak 201)',
    body: 'liked ❤️ and thanked 🙏 your reply in Ashtavinayak General: "Yes Pooja ji! Security gate #1..."',
    time: '38m ago',
    unread: true,
    actorInitials: 'PK',
    actorBg: '#4F46E5',
    badgeType: 'heart',
  },
  {
    id: 'n3',
    category: 'activity',
    title: 'Sunita Deshmukh (Ballaleshwar 304)',
    body: 'replied to your post in Buy, Sell & Food Corner: "Order confirmed for Chintamani 303!"',
    time: '2h ago',
    unread: true,
    actorInitials: 'SD',
    actorBg: '#EA580C',
    badgeType: 'comment',
  },
];

const WHATSAPP_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉'];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark, tokens } = useTheme();
  const { user } = useAuth();

  // Resident profile (auto-assigns building group from user profile or default)
  const userProfile = {
    name: user?.full_name || 'Mayur',
    building: (user?.wing?.replace('Wing ', '') ? `Wing ${user.wing.replace('Wing ', '')}` : 'Chintamani'),
    flat: user?.flat_number || '303',
  };

  // Navigation & overlays
  const [activeTab, setActiveTab] = useState<'community' | 'direct'>('community');
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [activeDmId, setActiveDmId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'pinned' | 'activity'>('all');

  // Privacy-First DM Search & Request state
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [selectedRequestTarget, setSelectedRequestTarget] = useState<ResidentMember | null>(null);
  const [requestNoteText, setRequestNoteText] = useState('');
  const [showRequestsView, setShowRequestsView] = useState(false);

  // Data state: Community channels keep a fixed structure; Direct messages use WhatsApp-style recency sorting
  const [wingGroup, setWingGroup] = useState<ChannelGroup>(() =>
    createWingGroupData('Chintamani', '303')
  );
  const [communities, setCommunities] = useState<ChannelGroup[]>(INITIAL_UNIVERSAL_CHANNELS);
  const [dms, setDms] = useState<DmThread[]>(() => sortByMostRecent(INITIAL_DMS));
  const [dmRequests, setDmRequests] = useState<DmRequestItem[]>(INITIAL_DM_REQUESTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  // Composer & 2-second hold reaction state
  const [messageText, setMessageText] = useState('');
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<ChatAttachment | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const unreadNotifCount = notifications.filter((n) => n.unread).length;
  const unreadDmCount = dms.reduce((sum, d) => sum + d.unread, 0) + dmRequests.length;
  const unreadCommunityCount =
    (wingGroup.unread > 0 ? 1 : 0) +
    communities.filter((c) => ((c as any).isMuted ? false : c.unread > 0)).length;
  const unreadDmTabCount = dms.filter((d) => d.unread > 0).length + dmRequests.length;

  const activeCommunity =
    activeCommunityId === wingGroup.id
      ? wingGroup
      : communities.find((c) => c.id === activeCommunityId);
  const activeDm = dms.find((d) => d.id === activeDmId);

  const colors = {
    bg: isDark ? '#000000' : '#F5F5F7',
    card: isDark ? '#111113' : '#FFFFFF',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    text: isDark ? '#F5F5F5' : '#111113',
    subText: isDark ? '#A1A1AA' : '#64748B',
    activeSquircleBg: isDark ? '#F5F5F5' : '#09090B',
    activeSquircleBorder: isDark ? '#F5F5F5' : '#09090B',
    activeSquircleText: isDark ? '#000000' : '#FFFFFF',
    incomingBubble: isDark ? '#121214' : '#FFFFFF',
    outgoingBubble: isDark ? '#1C1C1E' : '#09090B',
    inputBg: isDark ? '#18181B' : '#F4F4F5',
  };

  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);
  const safeSetTimeout = (fn: () => void, delay: number) => {
    const timer = setTimeout(() => {
      activeTimersRef.current = activeTimersRef.current.filter((t) => t !== timer);
      fn();
    }, delay);
    activeTimersRef.current.push(timer);
    return timer;
  };

  useEffect(() => {
    return () => {
      activeTimersRef.current.forEach((t) => clearTimeout(t));
      activeTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    safeSetTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, [activeCommunityId, activeDmId, wingGroup.messages.length, communities, dms]);

  // Live Supabase Realtime subscription for instant message & reaction updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // 1. Initial hydration from Supabase
    chatService.fetchMessages({ roomType: 'community', roomId: 'community', limit: 30 }).then(({ messages: liveMsgs }) => {
      if (liveMsgs.length > 0) {
        setCommunities((prev) =>
          prev.map((c) => {
            if (c.id === 'comm-general' || c.id === 'general' || c.id === 'community') {
              const mapped = liveMsgs.map((raw) => ({
                id: raw.id,
                senderId: raw.sender_id === (user?.id || 'usr-current-1') ? 'me' : raw.sender_id,
                senderName: raw.sender?.full_name || 'Resident',
                flat: raw.sender ? `${raw.sender.wing} ${raw.sender.flat_number}` : '',
                text: raw.text,
                time: new Date(raw.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: (raw.is_read ? 'read' : 'delivered') as 'read' | 'delivered',
                reactions: Object.fromEntries(
                  Object.entries(raw.reactions || {}).map(([emoji, userIds]) => [emoji, (userIds as string[]).length])
                ),
                userReacted: Object.entries(raw.reactions || {})
                  .filter(([_, userIds]) => (userIds as string[]).includes(user?.id || 'usr-current-1'))
                  .map(([emoji]) => emoji),
                attachment: raw.media_url
                  ? { type: (raw.media_url.endsWith('.pdf') ? 'file' : 'image') as 'file' | 'image', uri: raw.media_url, name: 'attachment' }
                  : undefined,
              }));
              return { ...c, messages: mapped };
            }
            return c;
          })
        );
      }
    });

    // 2. Realtime WebSocket subscription
    const unsubscribe = chatService.subscribeToMessages((event) => {
      const raw = event.new;
      if (!raw) return;

      const timeFormatted = new Date(raw.created_at || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const normalizedMsg: ChatMessage = {
        id: raw.id,
        senderId: raw.sender_id === (user?.id || 'usr-current-1') ? 'me' : raw.sender_id,
        senderName: raw.sender?.full_name || 'Resident',
        flat: raw.sender ? `${raw.sender.wing} ${raw.sender.flat_number}` : '',
        text: raw.text,
        time: timeFormatted,
        status: (raw.is_read ? 'read' : 'delivered') as 'read' | 'delivered',
        reactions: Object.fromEntries(
          Object.entries(raw.reactions || {}).map(([emoji, userIds]) => [emoji, (userIds as string[]).length])
        ),
        userReacted: Object.entries(raw.reactions || {})
          .filter(([_, userIds]) => (userIds as string[]).includes(user?.id || 'usr-current-1'))
          .map(([emoji]) => emoji),
        attachment: raw.media_url
          ? {
              type: (raw.media_url.endsWith('.pdf') ? 'file' : 'image') as 'file' | 'image',
              uri: raw.media_url,
              name: 'attachment',
            }
          : undefined,
      };

      if (raw.room_type === 'community') {
        setCommunities((prev) =>
          prev.map((c) => {
            const matchesRoom =
              c.id === raw.room_id ||
              (c.id === 'comm-general' && (raw.room_id === 'community' || raw.room_id === 'comm-general')) ||
              (!c.id && raw.room_id === 'community') ||
              c.id === 'general';
            if (matchesRoom) {
              if (c.messages.some((m) => m.id === normalizedMsg.id)) {
                return {
                  ...c,
                  messages: c.messages.map((m) => (m.id === normalizedMsg.id ? normalizedMsg : m)),
                };
              }
              return {
                ...c,
                lastTime: timeFormatted,
                messages: [...c.messages, normalizedMsg],
              };
            }
            return c;
          })
        );
      } else if (raw.room_type === 'dm') {
        setDms((prev) => {
          const updated = prev.map((d) => {
            const isTarget = d.id === raw.room_id || d.resident.id === raw.sender_id || d.resident.id === raw.recipient_id;
            if (isTarget) {
              if (d.messages.some((m) => m.id === normalizedMsg.id)) {
                return {
                  ...d,
                  messages: d.messages.map((m) => (m.id === normalizedMsg.id ? normalizedMsg : m)),
                };
              }
              return {
                ...d,
                lastTime: timeFormatted,
                lastMessageAt: Date.now(),
                messages: [...d.messages, normalizedMsg],
              };
            }
            return d;
          });
          return sortByMostRecent(updated);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, wingGroup.id]);

  // Back button navigation (Used by both UI top-nav and Android Hardware Back Button)
  const handleBack = () => {
    if (activeReactionMsgId) {
      setActiveReactionMsgId(null);
      return true;
    }
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
      return true;
    }
    if (showRequestsView) {
      setShowRequestsView(false);
      return true;
    }
    if (showNotifications) {
      setShowNotifications(false);
      return true;
    }
    if (showNewDmModal) {
      if (selectedRequestTarget) {
        setSelectedRequestTarget(null);
        setRequestNoteText('');
        return true;
      }
      setShowNewDmModal(false);
      setDmSearchQuery('');
      return true;
    }
    if (activeTab === 'community' && activeCommunityId) {
      setActiveCommunityId(null);
      return true;
    }
    if (activeTab === 'direct' && activeDmId) {
      setActiveDmId(null);
      return true;
    }
    return false;
  };

  // Hardware Back Button listener on Android
  useEffect(() => {
    const onHardwareBack = () => {
      return handleBack();
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backHandler.remove();
  }, [
    activeReactionMsgId,
    showEmojiPicker,
    showRequestsView,
    showNotifications,
    showNewDmModal,
    selectedRequestTarget,
    activeTab,
    activeCommunityId,
    activeDmId,
  ]);

  // Document picker handler
  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const isImg =
          file.mimeType?.startsWith('image/') ||
          /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
        setAttachedMedia({
          type: isImg ? 'image' : 'file',
          uri: file.uri,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType || undefined,
        });
        setShowEmojiPicker(false);
      }
    } catch (e) {
      console.log('Document picker error:', e);
    }
  };

  // Camera / image launcher handler
  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        const libRes = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        });
        if (!libRes.canceled && libRes.assets && libRes.assets.length > 0) {
          const img = libRes.assets[0];
          setAttachedMedia({
            type: 'image',
            uri: img.uri,
            name: img.fileName || `IMG_${Date.now()}.jpg`,
            size: img.fileSize,
          });
          setShowEmojiPicker(false);
        }
        return;
      }
      const camRes = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!camRes.canceled && camRes.assets && camRes.assets.length > 0) {
        const img = camRes.assets[0];
        setAttachedMedia({
          type: 'image',
          uri: img.uri,
          name: img.fileName || `IMG_${Date.now()}.jpg`,
          size: img.fileSize,
        });
        setShowEmojiPicker(false);
      }
    } catch (e) {
      console.log('Camera picker error:', e);
    }
  };

  // Helper to progress WhatsApp status ticks
  const updateMessageStatus = (msgId: string, status: 'delivered' | 'read') => {
    setWingGroup((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === msgId ? { ...m, status } : m)),
    }));
    setCommunities((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === msgId ? { ...m, status } : m)),
      }))
    );
    setDms((prev) =>
      prev.map((d) => ({
        ...d,
        messages: d.messages.map((m) => (m.id === msgId ? { ...m, status } : m)),
      }))
    );
  };

  // WhatsApp-style status ticks: single grey (sent), double grey (delivered), double blue #38BDF8 (seen)
  const renderStatusTicks = (status?: 'sent' | 'delivered' | 'read') => {
    if (status === 'sent') {
      return <Check size={13} color="#94A3B8" />;
    }
    if (status === 'delivered') {
      return <CheckCheck size={13} color="#94A3B8" />;
    }
    return <CheckCheck size={13} color="#38BDF8" />;
  };

  // Render attachment thumbnail/card inside a message bubble
  const renderAttachmentInBubble = (att: ChatAttachment, isMe: boolean) => {
    if (att.type === 'image') {
      return (
        <View style={{ marginBottom: 6, borderRadius: 12, overflow: 'hidden' }}>
          <Image
            source={{ uri: att.uri }}
            style={{ width: 220, height: 160 }}
            resizeMode="cover"
          />
        </View>
      );
    }
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: isMe ? 'rgba(0, 0, 0, 0.22)' : isDark ? '#232B3B' : '#F1F5F9',
          padding: 10,
          borderRadius: 12,
          marginBottom: 6,
          maxWidth: 240,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: '#059669',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileText size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: isMe ? '#FFFFFF' : colors.text,
            }}
          >
            {att.name || 'Document'}
          </Text>
          {att.size ? (
            <Text
              style={{
                fontSize: 10,
                color: isMe ? '#D1FAE5' : colors.subText,
                marginTop: 2,
              }}
            >
              {(att.size / 1024).toFixed(1)} KB
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  // Single-reaction per user toggle
  const applyReactionToggle = (msg: ChatMessage, emoji: string): ChatMessage => {
    const previousEmoji = msg.userReacted?.[0] || null;
    const nextReactions = { ...msg.reactions };
    if (previousEmoji) {
      const decremented = (nextReactions[previousEmoji] || 1) - 1;
      if (decremented <= 0) {
        delete nextReactions[previousEmoji];
      } else {
        nextReactions[previousEmoji] = decremented;
      }
    }
    if (previousEmoji === emoji) {
      return { ...msg, reactions: nextReactions, userReacted: [] };
    }
    nextReactions[emoji] = (nextReactions[emoji] || 0) + 1;
    return { ...msg, reactions: nextReactions, userReacted: [emoji] };
  };

  const handleCommunityReaction = (commId: string, msgId: string, emoji: string) => {
    if (commId === wingGroup.id) {
      setWingGroup((prev) => ({
        ...prev,
        messages: prev.messages.map((m) => (m.id === msgId ? applyReactionToggle(m, emoji) : m)),
      }));
    } else {
      setCommunities((prev) =>
        prev.map((c) =>
          c.id === commId
            ? {
                ...c,
                messages: c.messages.map((m) => (m.id === msgId ? applyReactionToggle(m, emoji) : m)),
              }
            : c
        )
      );
    }
    setActiveReactionMsgId(null);
    if (isSupabaseConfigured) {
      chatService.toggleReaction(msgId, emoji, user?.id).catch((e) => console.warn('[chat] reaction error:', e));
    }
  };

  const handleDmReaction = (dmId: string, msgId: string, emoji: string) => {
    setDms((prev) =>
      prev.map((d) =>
        d.id === dmId
          ? {
              ...d,
              messages: d.messages.map((m) => (m.id === msgId ? applyReactionToggle(m, emoji) : m)),
            }
          : d
      )
    );
    setActiveReactionMsgId(null);
    if (isSupabaseConfigured) {
      chatService.toggleReaction(msgId, emoji, user?.id).catch((e) => console.warn('[chat] dm reaction error:', e));
    }
  };

  const handleSendMessage = () => {
    const trimmed = messageText.trim();
    if (!trimmed && !attachedMedia) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestamp = Date.now();
    const newMsgId = `msg-${timestamp}`;
    const attachmentToSend = attachedMedia ? { ...attachedMedia } : undefined;

    if (activeTab === 'community' && activeCommunity && !activeCommunity.readOnly) {
      const newMsg: ChatMessage = {
        id: newMsgId,
        senderId: 'me',
        senderName: 'You',
        flat: `${userProfile.building} ${userProfile.flat}`,
        text: trimmed,
        time: now,
        status: 'sent',
        reactions: {},
        userReacted: [],
        attachment: attachmentToSend,
      };
      if (activeCommunity.id === wingGroup.id) {
        setWingGroup((prev) => ({
          ...prev,
          lastTime: now,
          messages: [...prev.messages, newMsg],
        }));
      } else {
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === activeCommunity.id
              ? {
                  ...c,
                  lastTime: now,
                  subtitle: `You: ${trimmed || (attachmentToSend ? (attachmentToSend.type === 'image' ? '📷 Photo' : '📄 Document') : '')}`,
                  messages: [...c.messages, newMsg],
                }
              : c
          )
        );
      }
      setMessageText('');
      setAttachedMedia(null);
      setShowEmojiPicker(false);

      // WhatsApp status tick progression: delivered (1s), read (2.5s)
      safeSetTimeout(() => updateMessageStatus(newMsgId, 'delivered'), 1000);
      safeSetTimeout(() => updateMessageStatus(newMsgId, 'read'), 2500);

      if (isSupabaseConfigured) {
        chatService.sendMessage({
          roomType: 'community',
          roomId: activeCommunity.id === 'comm-general' ? 'community' : activeCommunity.id,
          text: trimmed,
          mediaUri: attachmentToSend?.uri,
          mimeType: attachmentToSend?.mimeType,
          fileName: attachmentToSend?.name,
        }).catch((e) => console.warn('[chat] send community error:', e));
      }
    } else if (activeTab === 'direct' && activeDm && activeDm.requestState === 'accepted') {
      const newMsg: ChatMessage = {
        id: newMsgId,
        senderId: 'me',
        text: trimmed,
        time: now,
        status: 'sent',
        reactions: {},
        userReacted: [],
        attachment: attachmentToSend,
      };

      animateLayoutTransition();
      setDms((prev) => {
        const updated = prev.map((d) =>
          d.id === activeDm.id
            ? {
                ...d,
                lastTime: now,
                lastMessageAt: timestamp,
                messages: [...d.messages, newMsg],
              }
            : d
        );
        return sortByMostRecent(updated);
      });
      setMessageText('');
      setAttachedMedia(null);
      setShowEmojiPicker(false);

      // WhatsApp status tick progression: delivered (1s), read (2.5s)
      safeSetTimeout(() => updateMessageStatus(newMsgId, 'delivered'), 1000);
      safeSetTimeout(() => updateMessageStatus(newMsgId, 'read'), 2500);

      if (isSupabaseConfigured) {
        chatService.sendMessage({
          roomType: 'dm',
          roomId: activeDm.id,
          recipientId: activeDm.resident.id,
          text: trimmed,
          mediaUri: attachmentToSend?.uri,
          mimeType: attachmentToSend?.mimeType,
          fileName: attachmentToSend?.name,
        }).catch((e) => console.warn('[chat] send dm error:', e));
      } else {
        // Simulate a realistic incoming neighbor reply ONLY in offline / demo mode
        const targetDmId = activeDm.id;
        const targetResident = activeDm.resident;
        safeSetTimeout(() => {
          const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const neighborReplies = [
            'Thank you Mayur ji! Really appreciate your quick response 🙏',
            'Noted! Will coordinate with Shivaji at Gate #1 👍',
            'Got it! Thanks for letting me know 😊',
            'Perfect! See you at the society clubhouse!',
          ];
          const chosenReply = neighborReplies[Math.floor(Math.random() * neighborReplies.length)];
          const incomingMsg: ChatMessage = {
            id: `dm-reply-${Date.now()}`,
            senderId: targetResident.id,
            text: chosenReply,
            time: replyTime,
            reactions: {},
            userReacted: [],
          };

          animateLayoutTransition();
          setDms((prev) => {
            const updated = prev.map((d) =>
              d.id === targetDmId
                ? {
                    ...d,
                    lastTime: replyTime,
                    lastMessageAt: Date.now(),
                    messages: [...d.messages, incomingMsg],
                  }
                : d
            );
            return sortByMostRecent(updated);
          });
        }, 4000);
      }
    }
  };

  // Privacy-First Search (Name or exact 10-digit mobile number; no open list)
  const trimmedSearch = dmSearchQuery.trim();
  const digitsOnly = trimmedSearch.replace(/\D/g, '');
  const isExactPhone = digitsOnly.length === 10;
  const matchedResidents =
    trimmedSearch.length < 2
      ? []
      : SOCIETY_MEMBERS_DB.filter((member) => {
          if (isExactPhone) return member.phone === digitsOnly;
          if (/^\d+$/.test(trimmedSearch)) return false;
          return member.name.toLowerCase().includes(trimmedSearch.toLowerCase());
        });

  const handleSendDmRequest = () => {
    if (!selectedRequestTarget) return;
    const note =
      requestNoteText.trim() ||
      `Hi ${selectedRequestTarget.name.split(' ')[0]} ji, I am ${userProfile.name} from ${userProfile.building} ${userProfile.flat}.`;
    const existing = dms.find((d) => d.resident.id === selectedRequestTarget.id);
    if (existing) {
      setShowNewDmModal(false); setSelectedRequestTarget(null); setDmSearchQuery(''); setRequestNoteText('');
      setActiveDmId(existing.id); return;
    }
    const timestamp = Date.now();
    const pendingThread: DmThread = {
      id: `dm-${selectedRequestTarget.id}`,
      resident: selectedRequestTarget,
      requestState: 'pending_sent',
      unread: 0,
      lastTime: 'Just now',
      lastMessageAt: timestamp,
      messages: [{ id: `req-${timestamp}`, senderId: 'me', text: note, time: 'Just now', status: 'sent', reactions: {}, userReacted: [] }],
    };
    animateLayoutTransition();
    setDms((prev) => sortByMostRecent([pendingThread, ...prev.filter((d) => d.id !== pendingThread.id)]));
    setShowNewDmModal(false); setSelectedRequestTarget(null); setDmSearchQuery(''); setRequestNoteText('');
    setActiveTab('direct'); setActiveDmId(pendingThread.id);
  };

  const handleAcceptRequest = (req: DmRequestItem) => {
    setDmRequests((prev) => prev.filter((r) => r.id !== req.id));
    const timestamp = Date.now();
    const acceptedThread: DmThread = {
      id: `dm-${req.resident.id}`,
      resident: req.resident,
      requestState: 'accepted',
      unread: 0,
      lastTime: req.time || 'Just now',
      lastMessageAt: timestamp,
      messages: [{ id: `acc-${timestamp}`, senderId: req.resident.id, text: req.introMessage, time: req.time || 'Just now', reactions: {}, userReacted: [] }],
    };
    animateLayoutTransition();
    setDms((prev) => sortByMostRecent([acceptedThread, ...prev.filter((d) => d.id !== acceptedThread.id)]));
    setShowRequestsView(false);
    setActiveTab('direct');
    setActiveDmId(acceptedThread.id);
  };

  const renderChannelIcon = (type: ChannelGroup['iconType'], color: string) => {
    switch (type) {
      case 'wing': return <Home size={20} color={color} />;
      case 'megaphone': return <Megaphone size={20} color={color} />;
      case 'food': return <Utensils size={20} color={color} />;
      case 'sparkles': return <Sparkles size={20} color={color} />;
      default: return <Building2 size={20} color={color} />;
    }
  };

  const isChatOpen =
    !showNotifications &&
    !showNewDmModal &&
    !showRequestsView &&
    ((activeTab === 'community' && activeCommunityId !== null) ||
      (activeTab === 'direct' && activeDmId !== null));

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ============================================================
          TOP NAVIGATION BAR (4 COHESIVE SQUIRCLE ELEMENTS)
      ============================================================ */}
      <View
        style={[
          styles.topNav,
          { paddingTop: insets.top + 8, backgroundColor: colors.bg, borderBottomColor: colors.border },
        ]}
      >
        {/* 1. Back Squircle */}
        <TouchableOpacity
          onPress={() => {
            const handled = handleBack();
            if (!handled) {
              router.replace('/(tabs)/feed');
            }
          }}
          activeOpacity={0.8}
          style={[styles.iconSquircle, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <ArrowLeft size={19} color={colors.text} strokeWidth={2.2} />
        </TouchableOpacity>

        {/* 2. Community Squircle */}
        <TouchableOpacity
          onPress={() => {
            setShowNotifications(false); setShowNewDmModal(false); setShowRequestsView(false);
            setActiveTab('community');
            if (activeTab !== 'community') setActiveCommunityId(null);
          }}
          activeOpacity={0.85}
          style={[
            styles.tabSquircle,
            {
              backgroundColor: activeTab === 'community' && !showNotifications ? colors.activeSquircleBg : colors.card,
              borderColor: activeTab === 'community' && !showNotifications ? colors.activeSquircleBorder : colors.border,
            },
          ]}
        >
          <Users size={16} color={activeTab === 'community' && !showNotifications ? colors.activeSquircleText : colors.text} />
          <Text style={[styles.tabLabel, { color: activeTab === 'community' && !showNotifications ? colors.activeSquircleText : colors.text }]}>
            Community
          </Text>
          <UnreadBadge
            count={unreadCommunityCount}
            variant={activeTab === 'community' && !showNotifications ? 'activeTab' : 'inactiveTab'}
          />
        </TouchableOpacity>

        {/* 3. Direct Messages Squircle */}
        <TouchableOpacity
          onPress={() => {
            setShowNotifications(false); setShowNewDmModal(false); setShowRequestsView(false);
            setActiveTab('direct'); setActiveDmId(null);
          }}
          activeOpacity={0.85}
          style={[
            styles.tabSquircle,
            {
              backgroundColor: activeTab === 'direct' && !showNotifications ? colors.activeSquircleBg : colors.card,
              borderColor: activeTab === 'direct' && !showNotifications ? colors.activeSquircleBorder : colors.border,
            },
          ]}
        >
          <MessageSquare size={16} color={activeTab === 'direct' && !showNotifications ? colors.activeSquircleText : colors.text} />
          <Text style={[styles.tabLabel, { color: activeTab === 'direct' && !showNotifications ? colors.activeSquircleText : colors.text }]}>
            Direct
          </Text>
          <UnreadBadge
            count={unreadDmTabCount}
            variant={activeTab === 'direct' && !showNotifications ? 'activeTab' : 'inactiveTab'}
          />
        </TouchableOpacity>

        {/* 4. Notification Bell Squircle */}
        <TouchableOpacity
          onPress={() => setShowNotifications(!showNotifications)}
          activeOpacity={0.8}
          style={[
            styles.iconSquircle,
            {
              backgroundColor: showNotifications ? colors.activeSquircleBg : colors.card,
              borderColor: showNotifications ? colors.activeSquircleBorder : colors.border,
            },
          ]}
        >
          <Bell size={19} color={showNotifications ? colors.activeSquircleText : colors.text} strokeWidth={2.2} />
          {unreadNotifCount > 0 && (
            <View style={styles.redNotifDot}>
              <Text style={styles.badgeWhiteText}>{formatBadgeCount(unreadNotifCount)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ============================================================
          MAIN BODY
      ============================================================ */}
      {showNotifications ? (
        /* INSTAGRAM-STYLE NOTIFICATION CENTER */
        <ScrollView contentContainerStyle={styles.scrollPad}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Society Activity & Notices</Text>
            {unreadNotifCount > 0 && (
              <TouchableOpacity onPress={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}>
                <Text style={styles.emeraldLink}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            {([
              { id: 'all', label: 'All' },
              { id: 'pinned', label: 'Pinned & Important' },
              { id: 'activity', label: 'Likes & Replies' },
            ] as const).map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setNotifFilter(tab.id)}
                style={[styles.filterChip, { backgroundColor: notifFilter === tab.id ? '#059669' : colors.card, borderColor: notifFilter === tab.id ? '#059669' : colors.border }]}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: notifFilter === tab.id ? '#FFFFFF' : colors.text }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {notifications
            .filter((n) => notifFilter === 'all' || n.category === notifFilter)
            .map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, unread: false } : n));
                  setShowNotifications(false);
                  setActiveTab('community');
                  setActiveCommunityId(item.category === 'pinned' ? 'comm-announcements' : 'comm-general');
                }}
                style={[styles.cardBox, { backgroundColor: colors.card, borderColor: item.unread ? '#10B981' : colors.border }]}
              >
                <View style={[styles.avatarSquare, { backgroundColor: item.actorBg }]}>
                  <Text style={styles.avatarText}>{item.actorInitials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ fontSize: 10, color: colors.subText }}>{item.time}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.subText, marginTop: 3, lineHeight: 17 }}>{item.body}</Text>
                </View>
              </TouchableOpacity>
            ))}
        </ScrollView>
      ) : activeTab === 'community' ? (
        activeCommunityId === null ? (
          /* TWO-TIER COMMUNITY LIST */
          <ScrollView contentContainerStyle={styles.scrollPad}>
            <View style={{ marginBottom: 8 }}>
              <Text style={[styles.microLabel, { color: colors.subText }]}>MY BUILDING GROUP</Text>
            </View>

            <TouchableOpacity
              onPress={() => { setActiveCommunityId(wingGroup.id); setWingGroup((prev) => ({ ...prev, unread: 0 })); }}
              style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}
            >
              <View style={[styles.wingIconSquircle, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}><Home size={20} color={colors.text} strokeWidth={1.5} /></View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{wingGroup.name}</Text>
                  <Text style={{ fontSize: 10.5, color: colors.subText, fontWeight: '600' }}>{wingGroup.lastTime}</Text>
                </View>
                <View style={[styles.rowBetween, { marginTop: 3 }]}>
                  <Text style={{ fontSize: 12, color: colors.subText, flex: 1, marginRight: 8 }} numberOfLines={1}>
                    {wingGroup.messages[wingGroup.messages.length - 1]?.text}
                  </Text>
                  {wingGroup.unread > 0 && (
                    <UnreadBadge count={wingGroup.unread} />
                  )}
                </View>
              </View>
            </TouchableOpacity>

            <View style={{ marginBottom: 8 }}>
              <Text style={[styles.microLabel, { color: colors.subText }]}>SOCIETY COMMUNITY</Text>
            </View>

            {communities.map((comm) => (
              <TouchableOpacity
                key={comm.id}
                onPress={() => { setActiveCommunityId(comm.id); setCommunities((prev) => prev.map((c) => c.id === comm.id ? { ...c, unread: 0 } : c)); }}
                style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.avatarSquare, { backgroundColor: comm.accentBg }]}>
                  {renderChannelIcon(comm.iconType, comm.accentColor)}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{comm.name}</Text>
                    <Text style={{ fontSize: 10.5, color: colors.subText }}>{comm.lastTime}</Text>
                  </View>
                  <View style={[styles.rowBetween, { marginTop: 3 }]}>
                    <Text style={{ fontSize: 12, color: colors.subText, flex: 1, marginRight: 8 }} numberOfLines={1}>{comm.subtitle}</Text>
                    {comm.unread > 0 ? (
                      <UnreadBadge count={comm.unread} />
                    ) : (
                      <ChevronRight size={16} color={colors.subText} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          /* ACTIVE COMMUNITY CHAT */
          <View style={{ flex: 1 }}>
            <View style={[styles.subHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={[styles.smallSquircle, { backgroundColor: activeCommunity?.accentBg }]}>
                {activeCommunity && renderChannelIcon(activeCommunity.iconType, activeCommunity.accentColor)}
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{activeCommunity?.name}</Text>
            </View>

            <ScrollView ref={scrollViewRef} contentContainerStyle={styles.chatScroll} onScrollBeginDrag={() => setActiveReactionMsgId(null)}>
              {activeCommunity?.messages.map((msg) => {
                const isMe = msg.senderId === 'me';
                const isPickerOpen = activeReactionMsgId === msg.id;
                return (
                  <View key={msg.id} style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
                    {isPickerOpen && (
                      <View style={[styles.reactionTray, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {WHATSAPP_REACTIONS.map((emoji) => (
                          <TouchableOpacity
                            key={emoji}
                            onPress={() => handleCommunityReaction(activeCommunity.id, msg.id, emoji)}
                            style={[styles.reactionBtn, msg.userReacted.includes(emoji) && { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}
                          >
                            <Text style={{ fontSize: 19 }}>{emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <Pressable
                      delayLongPress={2000}
                      onLongPress={() => setActiveReactionMsgId(msg.id)}
                      onPress={() => { if (activeReactionMsgId) setActiveReactionMsgId(null); }}
                      style={[styles.bubble, { backgroundColor: isMe ? colors.outgoingBubble : colors.incomingBubble, borderColor: isMe ? 'transparent' : colors.border }]}
                    >
                      {!isMe && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#E4E4E7' : '#111113' }}>{msg.senderName}</Text>
                          <View style={[styles.countPill, { backgroundColor: colors.inputBg }]}><Text style={[styles.countPillText, { color: colors.subText }]}>{msg.flat}</Text></View>
                        </View>
                      )}
                      {msg.attachment && renderAttachmentInBubble(msg.attachment, isMe)}
                      {!!msg.text && (
                        <Text style={{ fontSize: 13.5, lineHeight: 19, color: isMe ? '#FFFFFF' : colors.text }}>{msg.text}</Text>
                      )}
                      <View style={styles.bubbleFooter}>
                        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                          {Object.entries(msg.reactions).map(([emoji, count]) => (
                            <TouchableOpacity
                              key={emoji}
                              onPress={() => handleCommunityReaction(activeCommunity.id, msg.id, emoji)}
                              style={[styles.reactionPill, msg.userReacted.includes(emoji) && { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{emoji} {count}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 10, color: colors.subText }}>{msg.time}</Text>
                          {isMe && renderStatusTicks(msg.status)}
                        </View>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )
      ) : activeDmId === null ? (
        /* DIRECT MESSAGES LIST */
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollPad}>
            <View style={[styles.rowBetween, { marginBottom: 10 }]}>
              <Text style={[styles.microLabel, { color: colors.subText }]}>MESSAGES</Text>
              <TouchableOpacity onPress={() => setShowRequestsView(true)} style={styles.requestPillBtn}>
                <Text style={styles.emeraldLink}>Requests</Text>
                {dmRequests.length > 0 && (
                  <UnreadBadge count={dmRequests.length} />
                )}
              </TouchableOpacity>
            </View>

            {dms.map((dm) => {
              const lastMsg = dm.messages[dm.messages.length - 1];
              const isPending = dm.requestState === 'pending_sent';
              return (
                <TouchableOpacity
                  key={dm.id}
                  onPress={() => { setActiveDmId(dm.id); setDms((prev) => prev.map((d) => d.id === dm.id ? { ...d, unread: 0 } : d)); }}
                  style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.avatarSquare, { backgroundColor: dm.resident.avatarColor }]}>
                    <Text style={styles.avatarText}>{dm.resident.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowBetween}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{dm.resident.name}</Text>
                        <View style={styles.flatTag}><Text style={[styles.flatTagText, { color: colors.subText }]}>{dm.resident.building} {dm.resident.flat}</Text></View>
                      </View>
                      <Text style={{ fontSize: 10.5, color: colors.subText }}>{dm.lastTime}</Text>
                    </View>
                    <View style={[styles.rowBetween, { marginTop: 3 }]}>
                      <Text style={{ fontSize: 12, color: colors.subText, flex: 1, marginRight: 8 }} numberOfLines={1}>
                        {isPending
                          ? 'Request sent • Waiting for acceptance'
                          : lastMsg?.attachment
                          ? lastMsg.attachment.type === 'image'
                            ? (lastMsg.text ? `📷 ${lastMsg.text}` : '📷 Photo')
                            : `📄 ${lastMsg.attachment.name || 'Document'}`
                          : lastMsg?.text || 'No messages yet'}
                      </Text>
                      {isPending ? (
                        <View style={styles.pendingTag}>
                          <Clock size={10} color="#D97706" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#D97706' }}>Pending</Text>
                        </View>
                      ) : dm.unread > 0 ? (
                        <UnreadBadge count={dm.unread} />
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            onPress={() => { setDmSearchQuery(''); setSelectedRequestTarget(null); setRequestNoteText(''); setShowNewDmModal(true); }}
            activeOpacity={0.85}
            style={[styles.fabPlus, { bottom: Math.max(insets.bottom + 10, 22), backgroundColor: isDark ? '#FFFFFF' : '#09090B' }]}
          >
            <Plus size={22} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      ) : (
        /* ACTIVE 1-ON-1 DM CHAT */
        <View style={{ flex: 1 }}>
          <View style={[styles.subHeader, { backgroundColor: colors.card, borderBottomColor: colors.border, justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
              <View style={[styles.smallSquircle, { backgroundColor: activeDm?.resident.avatarColor }]}>
                <Text style={styles.avatarText}>{activeDm?.resident.initials}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {activeDm?.resident.name}
              </Text>
            </View>

            <View
              style={[
                styles.flatTag,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                  borderColor: colors.border,
                  borderWidth: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                },
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.subText }}>
                {activeDm?.resident.building} {activeDm?.resident.flat}
              </Text>
            </View>
          </View>

          <ScrollView ref={scrollViewRef} contentContainerStyle={styles.chatScroll} onScrollBeginDrag={() => setActiveReactionMsgId(null)}>
            {activeDm?.messages.map((msg) => {
              const isMe = msg.senderId === 'me';
              const isPickerOpen = activeReactionMsgId === msg.id;
              return (
                <View key={msg.id} style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
                  {isPickerOpen && (
                    <View style={[styles.reactionTray, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {WHATSAPP_REACTIONS.map((emoji) => (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() => handleDmReaction(activeDm.id, msg.id, emoji)}
                          style={[styles.reactionBtn, msg.userReacted.includes(emoji) && { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}
                        >
                          <Text style={{ fontSize: 19 }}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <Pressable
                    delayLongPress={2000}
                    onLongPress={() => setActiveReactionMsgId(msg.id)}
                    onPress={() => { if (activeReactionMsgId) setActiveReactionMsgId(null); }}
                    style={[styles.bubble, { backgroundColor: isMe ? colors.outgoingBubble : colors.incomingBubble, borderColor: isMe ? 'transparent' : colors.border }]}
                  >
                    {msg.attachment && renderAttachmentInBubble(msg.attachment, isMe)}
                    {!!msg.text && (
                      <Text style={{ fontSize: 13.5, lineHeight: 19, color: isMe ? '#FFFFFF' : colors.text }}>{msg.text}</Text>
                    )}
                    <View style={styles.bubbleFooter}>
                      <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                        {Object.entries(msg.reactions).map(([emoji, count]) => (
                          <TouchableOpacity
                            key={emoji}
                            onPress={() => handleDmReaction(activeDm.id, msg.id, emoji)}
                            style={[styles.reactionPill, msg.userReacted.includes(emoji) && { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>{emoji} {count}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 10, color: colors.subText }}>{msg.time}</Text>
                        {isMe && renderStatusTicks(msg.status)}
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ============================================================
          BOTTOM COMPOSER BAR
      ============================================================ */}
      {isChatOpen && (
        <View style={[styles.composerBar, { backgroundColor: colors.bg, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
          {attachedMedia && (
            <View
              style={[
                styles.attachmentPreviewStrip,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                {attachedMedia.type === 'image' ? (
                  <Image
                    source={{ uri: attachedMedia.uri }}
                    style={{ width: 44, height: 44, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      backgroundColor: '#059669',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText size={22} color="#FFFFFF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 12, fontWeight: '700', color: colors.text }}
                  >
                    {attachedMedia.name}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: '#10B981', marginTop: 2 }}>
                    {attachedMedia.type === 'image'
                      ? 'Photo attached • Tap send'
                      : attachedMedia.size
                      ? `${(attachedMedia.size / 1024).toFixed(1)} KB • Document attached`
                      : 'Document attached • Tap send'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setAttachedMedia(null)}
                style={[
                  styles.iconSquircle,
                  {
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    backgroundColor: isDark ? '#232B3B' : '#F1F5F9',
                    borderColor: colors.border,
                  },
                ]}
              >
                <X size={15} color={colors.subText} />
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'community' && activeCommunity?.readOnly ? (
            <View style={[styles.lockedBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Lock size={14} color="#F59E0B" />
              <Text style={{ fontSize: 12, color: colors.subText, fontWeight: '600' }}>Only society admins can send messages in Announcements</Text>
            </View>
          ) : activeTab === 'direct' && activeDm?.requestState === 'pending_sent' ? (
            <View style={[styles.lockedBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Clock size={14} color="#F59E0B" />
              <Text style={{ fontSize: 12, color: colors.subText, fontWeight: '600' }}>Waiting for {activeDm.resident.name} to accept your request</Text>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.inputPill, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TouchableOpacity
                    onPress={() => setShowEmojiPicker((prev) => !prev)}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Smile
                      size={20}
                      color={showEmojiPicker ? '#10B981' : colors.subText}
                      strokeWidth={showEmojiPicker ? 2.4 : 1.8}
                    />
                  </TouchableOpacity>

                  <TextInput
                    value={messageText}
                    onChangeText={setMessageText}
                    onFocus={() => setShowEmojiPicker(false)}
                    placeholder={
                      attachedMedia
                        ? 'Add a caption...'
                        : activeTab === 'community'
                        ? `Message ${activeCommunity?.name}...`
                        : `Message ${activeDm?.resident.name}...`
                    }
                    placeholderTextColor={colors.subText}
                    style={[styles.textInput, { color: colors.text }]}
                  />

                  <TouchableOpacity
                    onPress={handlePickDocument}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Paperclip size={18} color={attachedMedia?.type === 'file' ? '#10B981' : colors.subText} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleLaunchCamera}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Camera size={18} color={attachedMedia?.type === 'image' ? '#10B981' : colors.subText} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleSendMessage}
                  style={[
                    styles.sendSquircle,
                    { backgroundColor: isDark ? '#FFFFFF' : '#09090B' },
                  ]}
                  activeOpacity={0.85}
                >
                  <Send size={18} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>

              {/* Working Emoji Picker Tray */}
              {showEmojiPicker && (
                <View
                  style={[
                    styles.emojiPickerContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.emojiPickerHeader}>
                    <Text style={[styles.emojiPickerTitle, { color: colors.subText }]}>EMOJIS</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => setMessageText((prev) => prev.slice(0, -2))}
                        style={styles.backspaceBtn}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.subText }}>⌫ Backspace</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setShowEmojiPicker(false)}
                        style={[styles.smallCloseBtn, { backgroundColor: isDark ? '#232B3B' : '#E2E8F0' }]}
                      >
                        <X size={13} color={colors.subText} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: 180 }}
                    contentContainerStyle={styles.emojiGrid}
                  >
                    {POPULAR_EMOJIS.map((emoji, idx) => (
                      <TouchableOpacity
                        key={`${emoji}-${idx}`}
                        onPress={() => setMessageText((prev) => prev + emoji)}
                        style={styles.emojiItem}
                      >
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* ============================================================
          MODAL 1: PRIVACY-FIRST DM SEARCH & REQUEST
      ============================================================ */}
      {showNewDmModal && (
        <Modal
          visible={true}
          animationType="slide"
          transparent
          onRequestClose={() => { setShowNewDmModal(false); setSelectedRequestTarget(null); }}
        >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg, paddingTop: insets.top + 12 }]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Find Resident to Request Chat</Text>
              <Text style={{ fontSize: 11.5, color: colors.subText }}>Search by Name or exact 10-digit Mobile No.</Text>
            </View>
            <TouchableOpacity
              onPress={() => { setShowNewDmModal(false); setSelectedRequestTarget(null); }}
              style={[styles.iconSquircle, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Search size={16} color={colors.subText} />
            <TextInput
              value={dmSearchQuery}
              onChangeText={(txt) => { setDmSearchQuery(txt); setSelectedRequestTarget(null); }}
              placeholder="Enter resident name or 10-digit mobile..."
              placeholderTextColor={colors.subText}
              style={[styles.textInput, { color: colors.text }]}
              autoFocus
            />
          </View>

          {trimmedSearch.length < 2 ? (
            <View style={[styles.cardBox, { flexDirection: 'column', alignItems: 'flex-start', backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <EyeOff size={16} color="#10B981" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>Directory Privacy Active</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.subText, marginTop: 6, lineHeight: 18 }}>
                To protect resident privacy, the society member list is not publicly browsable, and phone numbers & birthdates are hidden.
              </Text>
            </View>
          ) : selectedRequestTarget ? (
            <View style={[styles.cardBox, { flexDirection: 'column', alignItems: 'stretch', backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Request Chat with {selectedRequestTarget.name} ({selectedRequestTarget.building} {selectedRequestTarget.flat})
              </Text>
              <Text style={{ fontSize: 11, color: '#10B981', marginTop: 2, marginBottom: 10 }}>Mobile No. & Birthdate Hidden</Text>
              <TextInput
                value={requestNoteText}
                onChangeText={setRequestNoteText}
                placeholder={`Hi ${selectedRequestTarget.name.split(' ')[0]} ji, I am ${userProfile.name} from ${userProfile.building} ${userProfile.flat}...`}
                placeholderTextColor={colors.subText}
                multiline
                style={[styles.noteInput, { color: colors.text, borderColor: colors.border }]}
              />
              <TouchableOpacity onPress={handleSendDmRequest} style={[styles.primaryBtn, { backgroundColor: isDark ? '#FFFFFF' : '#09090B' }]}>
                <UserPlus size={16} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={1.5} />
                <Text style={[styles.primaryBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>Send Message Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView>
              {matchedResidents.map((res) => (
                <View key={res.id} style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.avatarSquare, { backgroundColor: res.avatarColor }]}>
                    <Text style={styles.avatarText}>{res.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{res.name} ({res.building} {res.flat})</Text>
                    <Text style={{ fontSize: 11, color: colors.subText }}>Contact & Birthdate Hidden</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedRequestTarget(res)} style={[styles.smallEmeraldBtn, { backgroundColor: isDark ? '#FFFFFF' : '#09090B' }]}>
                    <Text style={[styles.primaryBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>Request</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
      )}

      {/* ============================================================
          MODAL 2: INCOMING DM REQUESTS
      ============================================================ */}
      {showRequestsView && (
        <Modal
          visible={true}
          animationType="slide"
          transparent
          onRequestClose={() => setShowRequestsView(false)}
        >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg, paddingTop: insets.top + 12 }]}>
          {/* Header: Title with live count on left, squircle close button on right, NO subtext */}
          <View style={[styles.rowBetween, { marginBottom: 16, marginTop: 4 }]}>
            <Text style={[styles.requestHeaderTitle, { color: colors.text }]}>
              Message Requests ({dmRequests.length})
            </Text>
            <TouchableOpacity
              onPress={() => setShowRequestsView(false)}
              activeOpacity={0.7}
              style={[styles.iconSquircle, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 34) }}
          >
            {dmRequests.length === 0 ? (
              <View style={styles.requestEmptyState}>
                <View
                  style={[
                    styles.requestEmptyIconSquircle,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Inbox size={28} color={colors.subText} />
                </View>
                <Text style={[styles.requestEmptyTitle, { color: colors.text }]}>
                  No pending message requests
                </Text>
              </View>
            ) : (
              dmRequests.map((req) => (
                <View
                  key={req.id}
                  style={[
                    styles.requestCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  {/* Top row: Avatar squircle + Name/Time on left, Building/Flat badge on right */}
                  <View style={styles.requestTopRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
                      <View style={[styles.requestAvatarSquircle, { backgroundColor: req.resident.avatarColor }]}>
                        <Text style={styles.requestAvatarText}>{req.resident.initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.requestSenderName, { color: colors.text }]} numberOfLines={1}>
                          {req.resident.name}
                        </Text>
                        {!!req.time && (
                          <Text style={[styles.requestTimeText, { color: colors.subText }]}>
                            {req.time}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View
                      style={[
                        styles.requestFlatBadge,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.requestFlatBadgeText, { color: colors.subText }]}>
                        {req.resident.building} {req.resident.flat}
                      </Text>
                    </View>
                  </View>

                  {/* Middle section: Sender's intro message inside a tinted preview container */}
                  <View
                    style={[
                      styles.requestQuoteBox,
                      {
                        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.035)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
                      },
                    ]}
                  >
                    <Text style={[styles.requestQuoteText, { color: colors.text }]}>
                      “{req.introMessage}”
                    </Text>
                  </View>

                  {/* Bottom row: Equal-width Decline and Accept buttons */}
                  <View style={styles.requestActionRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setDmRequests((prev) => prev.filter((r) => r.id !== req.id))}
                      style={[
                        styles.requestDeclineBtn,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.requestDeclineText, { color: colors.text }]}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleAcceptRequest(req)}
                      style={[styles.requestAcceptBtn, { backgroundColor: isDark ? '#FFFFFF' : '#09090B' }]}
                    >
                      <Check size={16} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={1.5} />
                      <Text style={[styles.requestAcceptText, { color: isDark ? '#000000' : '#FFFFFF' }]}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, gap: 8 },
  iconSquircle: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabSquircle: { flex: 1, height: 42, borderRadius: 14, borderWidth: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 5 },
  tabLabel: { fontSize: 12, fontWeight: '800' },
  countPill: { backgroundColor: 'rgba(16, 185, 129, 0.14)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  countPillText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  greenBadge: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  redNotifDot: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#F43F5E', alignItems: 'center', justifyContent: 'center' },
  badgeWhiteText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  scrollPad: { padding: 14, paddingBottom: 90 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeading: { fontSize: 16, fontWeight: '800' },
  microLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  emeraldLink: { fontSize: 11.5, fontWeight: '800', color: '#10B981' },
  filterRow: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 11, borderWidth: 1 },
  cardBox: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 18, borderWidth: 1, marginBottom: 9, gap: 12 },
  wingIconSquircle: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  avatarSquare: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  smallSquircle: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  subHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  chatScroll: { padding: 14, paddingBottom: 24 },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 10 },
  reactionTray: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 24, borderWidth: 1, marginBottom: 6, gap: 6, elevation: 5 },
  reactionBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  reactionPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.35)' },
  requestPillBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  flatTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(148, 163, 184, 0.15)' },
  flatTagText: { fontSize: 10, fontWeight: '700' },
  pendingTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(245, 158, 11, 0.14)' },
  fabPlus: { position: 'absolute', right: 16, width: 52, height: 52, borderRadius: 18, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  composerBar: { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1 },
  attachmentPreviewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  emojiPickerContainer: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    elevation: 4,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  emojiPickerTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  backspaceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  smallCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 6,
  },
  emojiItem: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 16, borderWidth: 1, gap: 8 },
  inputPill: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 24, borderWidth: 1, paddingHorizontal: 12, height: 44, gap: 8 },
  textInput: { flex: 1, fontSize: 13.5 },
  sendSquircle: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  modalContainer: { flex: 1, paddingHorizontal: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, height: 44, marginVertical: 12, gap: 8 },
  noteInput: { borderWidth: 1, borderRadius: 14, padding: 10, minHeight: 74, fontSize: 13, marginBottom: 12, textAlignVertical: 'top' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', paddingVertical: 12, borderRadius: 14, gap: 6 },
  secondaryBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingVertical: 12, borderRadius: 14 },
  smallEmeraldBtn: { backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 11 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridChip: { width: '48%', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  flatChip: { width: '23%', paddingVertical: 9, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  requestHeaderTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  requestCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  requestTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  requestAvatarSquircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  requestAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  requestSenderName: { fontSize: 15, fontWeight: '800' },
  requestTimeText: { fontSize: 11.5, marginTop: 2, fontWeight: '500' },
  requestFlatBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  requestFlatBadgeText: { fontSize: 11.5, fontWeight: '700' },
  requestQuoteBox: { borderRadius: 12, padding: 12, marginVertical: 12, borderWidth: 1 },
  requestQuoteText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  requestActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestDeclineBtn: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  requestDeclineText: { fontSize: 13, fontWeight: '700' },
  requestAcceptBtn: { flex: 1, height: 42, borderRadius: 12, backgroundColor: '#059669', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  requestAcceptText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  requestEmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70, paddingHorizontal: 20 },
  requestEmptyIconSquircle: { width: 60, height: 60, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  requestEmptyTitle: { fontSize: 14.5, fontWeight: '700' },
});
