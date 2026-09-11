// ─── Installer ──────────────────────────────────────────────────────────────

export interface Installer {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  location: string | null;
  about: string | null;
  description: string | null;
  logo_url: string | null;
  card_image: string | null;
  banner_image: string | null;
  status: 'pending' | 'active' | 'suspended';
  role: 'installer' | 'admin';
  created_at: string;
  verified_at: string | null;
  must_change_password: number;
  claimed_at: string | null;
  experience: number;
  founded_year: number | null;
  rating: number;
  reviews_count: number;
  total_projects: number;
  total_kw: number;
  satisfaction_rate: number;
  contact_email: string | null;
  line_id: string | null;
  response_time: string | null;
  warranty_panel: string | null;
  warranty_inverter: string | null;
  warranty_workmanship: string | null;
  services: string | null;
  certifications: string | null;
  projects: string | null;
  reviews_sample: string | null;
  is_featured: number;
  featured_from: string | null;
  featured_until: string | null;
  profile_views: number;
  lat: number | null;
  lng: number | null;
  service_provinces: string | null; // JSON array string
  oauth_provider: string | null;
  oauth_id: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  website_url: string | null;
  affiliate_enabled: number;
  affiliate_commission_type: 'percent' | 'flat' | null;
  affiliate_commission_value: number;
  payout_bank_name: string | null;
  payout_account_number: string | null;
  payout_account_name: string | null;
  payout_recipient_type: 'individual' | 'corporation' | null;
  payout_tax_id: string | null;
  omise_recipient_id: string | null;
  insurance_verified_at: string | null;
  insurance_expires_at: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
}

export type InstallerPublic = Omit<Installer, 'password_hash' | 'oauth_id'>;

// ─── Review ─────────────────────────────────────────────────────────────────

export interface Review {
  id: number;
  installer_id: number;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  title: string;
  body: string;
  install_date: string | null;
  reply: string | null;
  reply_at: string | null;
  status: 'pending' | 'active' | 'rejected';
  verify_token: string | null;
  verified_at: string | null;
  created_at: string;
}

// ─── Lead ────────────────────────────────────────────────────────────────────

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  province: string;
  message: string | null;
  installer_id: number | null;
  created_at: string;
  status: 'new' | 'contacted' | 'closed';
  system_kw: number | null;
  calc_data: string | null; // JSON string
  calc_file: string | null;
}

// ─── Blog ────────────────────────────────────────────────────────────────────

export interface Blog {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author: string;
  category: string;
  tags: string | null; // JSON array string
  status: 'active' | 'draft';
  meta_title: string | null;
  meta_description: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

// ─── Portfolio ───────────────────────────────────────────────────────────────

export interface PortfolioPhoto {
  id: number;
  installer_id: number;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

// ─── Contact ─────────────────────────────────────────────────────────────────

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: 'new' | 'read' | 'resolved';
  created_at: string;
}

// ─── OAuthProvider ───────────────────────────────────────────────────────────

export interface OAuthProvider {
  provider: 'google' | 'facebook' | 'twitter' | 'tiktok';
  client_id: string;
  client_secret: string;
  active: number;
}

// ─── SiteContent ─────────────────────────────────────────────────────────────

export interface SiteContent {
  key: string;
  value: string;
  updated_at: string;
}

// ─── API Response helpers ────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  id: number;
  email: string;
  role: 'installer' | 'admin';
  name: string;
}

// Affiliate is a fully separate public role from installers/admin (own session
// cookie/table, see lib/auth.ts's getAffiliateSession()) — kept as its own
// payload shape rather than widening JwtPayload.role, since installer/admin
// code paths (requireAdmin, etc.) should never accidentally accept it.
export interface AffiliateJwtPayload {
  id: number;
  email: string;
  role: 'affiliate';
  name: string;
}

// ─── Affiliate / Referral Program ────────────────────────────────────────────

export interface Affiliate {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  referral_code: string;
  status: 'pending_verification' | 'active' | 'suspended';
  payout_bank_name: string | null;
  payout_account_number: string | null;
  payout_account_name: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Installer filter/query params ───────────────────────────────────────────

export interface InstallerQuery {
  search?: string;
  province?: string;
  sort?: 'rating' | 'reviews' | 'newest' | 'projects';
  page?: number;
  limit?: number;
}
