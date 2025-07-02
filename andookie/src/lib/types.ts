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
    condition: string;
    marketPrice: number;
    ourOffer: number;
    image?: string;
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
  }