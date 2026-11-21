export type WingCode =
  | 'Wing A'
  | 'Wing B'
  | 'Wing C'
  | 'Wing D'
  | 'Wing E'
  | 'Wing F'
  | 'Wing G'
  | 'Wing H'
  | 'Wing I'
  | 'Wing J'
  | 'Wing K'
  | 'Wing L';

export type UserRole = 'resident' | 'committee' | 'admin' | 'security';

export interface UserProfile {
  id: string;
  full_name: string;
  wing: WingCode;
  flat_number: string;
  phone: string;
  email: string;
  role: UserRole;
  bio?: string;
  avatar_url?: string;
  created_at: string;
}

export type PostTag = 'Announcement' | 'Photo/Video Post' | 'Event';

export interface Post {
  id: string;
  user_id: string;
  tag: PostTag;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  poster_url?: string;
  likes_count: number;
  created_at: string;
  expires_at: string;
  author?: UserProfile;
  is_liked?: boolean;
  comments_count?: number;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: UserProfile;
}

export type DietType = 'Pure Veg' | 'Non-Veg';

export interface FoodListing {
  id: string;
  chef_id: string;
  dish_name: string;
  price: number;
  diet_type: DietType;
  timing: string;
  portions_left: number;
  image_url?: string;
  rating?: number;
  is_active?: boolean;
  created_at: string;
  chef?: UserProfile;
}

export interface FoodOrder {
  id: string;
  listing_id: string;
  resident_id: string;
  quantity: number;
  total_amount: number;
  delivery_flat: string;
  delivery_note?: string;
  payment_method: string;
  order_status: 'Pending' | 'Confirmed' | 'Preparing' | 'Delivered' | 'Cancelled';
  created_at: string;
  dish?: FoodListing;
}

export type ComplaintVisibility = 'admin' | 'public';
export type ComplaintCategory =
  | 'Lift & Electrical'
  | 'Water & Plumbing'
  | 'Cleaning & Garbage'
  | 'Parking & Security'
  | 'Other';
export type ComplaintUrgency = 'Normal' | 'High' | 'Urgent';
export type ComplaintStatus = 'Open' | 'In Progress' | 'Assigned' | 'Resolved';

export interface Complaint {
  id: string;
  user_id: string;
  visibility: ComplaintVisibility;
  category: ComplaintCategory;
  urgency: ComplaintUrgency;
  title: string;
  description: string;
  media_url?: string;
  status: ComplaintStatus;
  admin_note?: string;
  upvotes_count: number;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
  is_upvoted?: boolean;
}

export interface ChatMessage {
  id: string;
  room_type: 'community' | 'dm';
  room_id: string;
  sender_id: string;
  recipient_id?: string;
  text: string;
  media_url?: string;
  reactions: Record<string, string[]>; // e.g., { "❤️": ["user-1"], "👍": ["user-2"] }
  is_read?: boolean;
  created_at: string;
  sender?: UserProfile;
}

export interface DirectMessageThread {
  id: string;
  recipient: UserProfile;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
}
