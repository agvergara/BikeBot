export interface ThumbnailImage {
  small: string;
  medium: string;
  detail: string;
}

export interface Motorcycle {
  id: string;
  brand: string;
  model: string;
  model_id: string;
  version_id: string;
  kms: number;
  year: number;
  driving_license: string;
  price: number;
  strike_through?: number;
  finance_price: number;
  renting_price: number | null;
  cc: number;
  motorbike_type: string;
  thumbnail_images: ThumbnailImage[];
  damage_images: any[];
  thumbnail_damage_images: any[];
  quota: number;
  fast_delivery_badge: string | null;
  is_booking_available: boolean;
  is_limitable: boolean;
  is_limited: boolean;
  emission_type: string | null;
  is_new: boolean;
  tags: string[];
  itv_next_date: string;
  num_keys: number;
  num_seats: number;
  deductible_vat: boolean;
  invisible: boolean;
}

export interface MundimotoApiResponse {
  motorbikes: Motorcycle[];
  total_count: number;
}

export interface StoredMotorcycle {
  id: string;
  brand: string;
  model: string;
  motorbike_type: string;
  price: number;
  imageUrl: string;
  lastUpdated: string;
  createdAt: string;
}

export interface MotorcycleChange {
  type: 'new' | 'price_update';
  motorcycle: StoredMotorcycle;
  oldPrice?: number;
}
