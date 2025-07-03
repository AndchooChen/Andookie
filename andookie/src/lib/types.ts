// src/lib/types.ts

export interface UploadedImage {
    id: number;
    file: File;
    url: string;
    name: string;
  }
  
  export interface Card {
    id: number;
    name: string;
    set: string;
    number: string;
    condition: CardCondition;
    marketPrice: number;
    ourOffer: number;
    image?: string;
    confidence?: number;
    originalText?: string;
  }
  
  export type CardCondition = 
    | 'Mint'
    | 'Near Mint'
    | 'Lightly Played'
    | 'Moderately Played'
    | 'Heavily Played';
  
  export interface CardProcessingResult {
    cards: Card[];
    totalLines?: number;
    matched?: number;
    unmatched?: string[];
    unmatchedLines?: number;
  }
  
  export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }
  
  export interface ProcessImagesResponse {
    cards: Card[];
    totalImages: number;
    processedImages: number;
    failedImages: string[];
  }
  
  export interface ProcessTextResponse {
    cards: Card[];
    totalLines: number;
    matched: number;
    unmatched: string[];
    unmatchedLines: number;
  }
  
  export interface AcceptOfferRequest {
    cards: Card[];
    totalOffer: number;
    customerInfo: {
      email: string;
      name: string;
      address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
      };
    };
  }
  
  export interface AcceptOfferResponse {
    orderId: string;
    shippingLabel: {
      trackingNumber: string;
      labelUrl: string;
    };
    estimatedPayment: {
      amount: number;
      processingTime: string;
    };
  }
  
  export interface ErrorDetails {
    code: string;
    message: string;
    field?: string;
  }
  
  export interface ValidationError {
    field: string;
    message: string;
  }
  
  // OCR-related types
  export interface OCRResult {
    text: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }
  
  export interface ImageProcessingResult {
    cardDetections: CardDetection[];
    ocrResults: OCRResult[];
    processingTime: number;
  }
  
  export interface CardDetection {
    cardName?: string;
    setName?: string;
    cardNumber?: string;
    condition?: CardCondition;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }
  
  // Database-related types
  export interface CardDatabaseEntry {
    id: string;
    name: string;
    set: string;
    setCode: string;
    number: string;
    rarity: string;
    marketPrice: number;
    lastUpdated: Date;
    variants: CardCondition[];
    imageUrl?: string;
  }
  
  export interface PriceData {
    marketPrice: number;
    lowPrice: number;
    midPrice: number;
    highPrice: number;
    lastUpdated: Date;
    source: 'tcgplayer' | 'ebay' | 'manual';
  }
  
  // Condition multipliers for pricing
  export const CONDITION_MULTIPLIERS: Record<CardCondition, number> = {
    'Mint': 1.1,
    'Near Mint': 1.0,
    'Lightly Played': 0.8,
    'Moderately Played': 0.6,
    'Heavily Played': 0.4
  };
  
  // Our offer percentage (70% of market value)
  export const OFFER_PERCENTAGE = 0.7;
  
  // Error codes
  export enum ErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    PROCESSING_ERROR = 'PROCESSING_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    API_ERROR = 'API_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    OCR_ERROR = 'OCR_ERROR',
    CARD_NOT_FOUND = 'CARD_NOT_FOUND',
    INVALID_IMAGE = 'INVALID_IMAGE',
    RATE_LIMITED = 'RATE_LIMITED',
    UNAUTHORIZED = 'UNAUTHORIZED'
  }
  
  // Utility type for loading states
  export interface LoadingState {
    isLoading: boolean;
    message?: string;
    progress?: number;
  }
  
  // Form validation schemas (can be used with Zod later)
  export interface CustomerInfoForm {
    email: string;
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
  }
  
  export interface ContactForm {
    name: string;
    email: string;
    subject: string;
    message: string;
  }