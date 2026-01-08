import api from '../services/api';
import { DbUser } from '../context/AuthContext';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

// --- (Timeline / Post) ---
interface User {
  id: number;
  nickname: string;
  role?: 'user' | 'artist' | 'admin';
  image_url?: string | null;
}

export interface PublicArtistInfo {
  id: number;
  nickname: string;
  image_url: string | null;
  name?: string; // バックエンドの変更に合わせてnameを追加（任意）
}

export interface Post {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user: User;
  publish_at: string | null;
  expires_at: string | null;
}
interface PaginatedResponse<T> {
  data: T[];
}
export const fetchPosts = async (): Promise<Post[]> => {
  const response = await api.get<PaginatedResponse<Post>>('/posts');
  return response.data.data;
};
export const fetchPostById = async (postId: number): Promise<Post> => {
  const response = await api.get<Post>(`/posts/${postId}`);
  return response.data;
};

// --- (Event) ---
export interface Event {
  id: number;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  artist_id: number;
  image_url: string | null;
  artist?: PublicArtistInfo;
}

export const fetchEvents = async (
  filter: 'upcoming' | 'past',
): Promise<Event[]> => {
  // バックエンドは paginate(...)->items() を返しているため、直接配列が来る想定
  const response = await api.get<Event[]>(`/events?filter=${filter}`);
  return response.data;
};

export interface TicketType {
  id: number;
  event_id: number;
  name: string;
  price: number;
  capacity: number;
  seating_type: 'random' | 'free';
}

// ★ 修正: is_owner を追加
export interface EventDetailData {
  event: Event;
  tickets: TicketType[];
  is_owner: boolean; 
}

// ★★★ 修正箇所: 1回のリクエストで取得するように変更 ★★★
export const fetchEventDetailData = async (
  eventId: number,
): Promise<EventDetailData> => {
  // バックエンド構造: { event: {...}, tickets: [...], is_owner: bool }
  const response = await api.get<EventDetailData>(`/events/${eventId}`);
  return response.data;
};

// --- (Product) ---
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string | null;
  is_liked?: boolean;
  likes_count: number;
  limit_per_user: number | null;
  artist?: PublicArtistInfo;
}
export const fetchProducts = async (): Promise<Product[]> => {
  const response = await api.get<Product[]>('/products');
  return response.data;
};
export const fetchProductById = async (productId: number): Promise<Product> => {
  const response = await api.get<Product>(`/products/${productId}`);
  return response.data;
};

// --- (Artist) ---
export interface Artist {
  id: number;
  nickname: string;
  image_url?: string | null;
  bio?: string; // バックエンドのselectに追加したため定義
}
export interface ArtistListResponse {
  artists: Artist[];
  following_ids: number[];
}
export const fetchArtists = async (
  search?: string,
): Promise<ArtistListResponse> => {
  const params = search ? { search } : {};
  const response = await api.get<ArtistListResponse>('/artists', { params });
  return response.data;
};

export interface ArtistPostMin {
  id: number;
  content: string;
  created_at: string;
  // title, image_url もバックエンドは返すが、使用しないなら定義不要
}
export interface ArtistEventMin {
  id: number;
  title: string;
  event_date: string;
}
export interface ArtistProductMin {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
}
export interface ArtistProfileData {
  id: number;
  nickname: string;
  image_url?: string | null;
  bio?: string;
  posts: ArtistPostMin[];
  events: ArtistEventMin[];
  products: ArtistProductMin[];
}
export const fetchArtistProfileData = async (
  artistId: number,
): Promise<ArtistProfileData> => {
  const response = await api.get<ArtistProfileData>(`/artists/${artistId}`);
  return response.data;
};

// --- (Auth / Profile) ---
export const fetchProfile = async (
  fbUser: FirebaseAuthTypes.User | null,
): Promise<DbUser | null> => {
  if (!fbUser) {
    return null;
  }
  try {
    const response = await api.get<DbUser>('/profile');
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      throw error;
    }
    console.error('fetchProfile: /profile の取得に失敗', error.response?.data);
    return null;
  }
};

// --- (My Tickets) ---
export interface UserTicket {
  id: number;
  seat_number: string;
  qr_code_id: string;
  is_used: boolean;
  event: {
    title: string;
    venue: string;
    event_date: string;
    image_url?: string | null;
  };
  ticket_type: {
    name: string;
  };
}
export const fetchMyTickets = async (): Promise<UserTicket[]> => {
  const response = await api.get<UserTicket[]>('/my-tickets');
  return response.data;
};

// --- (Order / History) ---
export interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
  product?: Product;
}
export interface ShippingAddress {
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  address_line1: string | null;
  address_line2: string | null;
  name?: string | null;
}
export interface Order {
  id: number;
  user_id: number;
  total_price: number;
  status: 'pending' | 'paid' | 'shipped' | 'redeemed';
  payment_method: 'cash' | 'stripe';
  delivery_method: 'venue' | 'mail';
  qr_code_id: string | null;
  created_at: string;
  items: OrderItem[];
  shipping_address: ShippingAddress | null;
}
export const fetchMyOrders = async (): Promise<Order[]> => {
  const response = await api.get<Order[]>('/my-orders');
  return response.data;
};

export const fetchMyFavorites = async (): Promise<Product[]> => {
  const response = await api.get<Product[]>('/my-favorites');
  return response.data;
};

export const fetchOrderById = async (orderId: number): Promise<Order> => {
  const response = await api.get<Order>(`/orders/${orderId}`);
  return response.data;
};