export type Step = 'pick-card' | 'compose' | 'preview' | 'address' | 'confirm' | 'success';

export type DeliveryOption = 'send_now' | 'timed' | 'custom';

export interface AddressData {
  recipientName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface SenderAddress {
  senderName: string;
  senderAddress1: string;
  senderCity: string;
  senderState: string;
  senderZip: string;
}

export interface HandwryttenCategory {
  id: number;
  name: string;
}

export interface HandwryttenCard {
  id: number;
  name: string;
  price: number;
  cover: string;
  inside_image: string;
  characters: number;
  font_size: number;
  orientation: string;
}

export interface HandwryttenFont {
  id: string;
  label: string;
  image: string;
  font_name: string;
  font_id: number;
  path: string;
  line_spacing: number;
}
