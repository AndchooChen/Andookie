// src/lib/errors.ts

import { ErrorCode, ErrorDetails } from './types';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly field?: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.PROCESSING_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    field?: string
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.field = field;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, field);
  }
}

export class ProcessingError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.PROCESSING_ERROR, 500, true);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.DATABASE_ERROR, 500, true);
  }
}

export class APIError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, ErrorCode.API_ERROR, statusCode, true);
  }
}

export class OCRError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.OCR_ERROR, 500, true);
  }
}

export class CardNotFoundError extends AppError {
  constructor(cardName: string) {
    super(`Card not found: ${cardName}`, ErrorCode.CARD_NOT_FOUND, 404, true);
  }
}

export class InvalidImageError extends AppError {
  constructor(message: string) {
    super(message, ErrorCode.INVALID_IMAGE, 400, true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, ErrorCode.RATE_LIMITED, 429, true);
  }
}

// Error handler utilities
export const handleError = (error: unknown): ErrorDetails => {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      field: error.field
    };
  }
  
  if (error instanceof Error) {
    return {
      code: ErrorCode.PROCESSING_ERROR,
      message: error.message
    };
  }
  
  return {
    code: ErrorCode.PROCESSING_ERROR,
    message: 'An unexpected error occurred'
  };
};

// User-friendly error messages
export const getUserFriendlyMessage = (error: ErrorDetails): string => {
  const friendlyMessages: Record<ErrorCode, string> = {
    [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
    [ErrorCode.PROCESSING_ERROR]: 'We encountered an issue processing your request. Please try again.',
    [ErrorCode.DATABASE_ERROR]: 'We\'re having trouble accessing our database. Please try again later.',
    [ErrorCode.API_ERROR]: 'We\'re experiencing technical difficulties. Please try again.',
    [ErrorCode.NETWORK_ERROR]: 'Network connection issue. Please check your connection and try again.',
    [ErrorCode.OCR_ERROR]: 'We couldn\'t read your images clearly. Please try uploading clearer photos.',
    [ErrorCode.CARD_NOT_FOUND]: 'We couldn\'t find that card in our database. Please check the spelling.',
    [ErrorCode.INVALID_IMAGE]: 'The image format is not supported. Please upload JPG, PNG, or WebP files.',
    [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
    [ErrorCode.UNAUTHORIZED]: 'You don\'t have permission to perform this action.'
  };
  
  return friendlyMessages[error.code] || error.message;
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateZipCode = (zipCode: string): boolean => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
};

export const validateImageFile = (file: File): void => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new InvalidImageError('Only JPEG, PNG, and WebP images are allowed');
  }
  
  if (file.size > maxSize) {
    throw new InvalidImageError('Image size must be less than 10MB');
  }
};

export const validateCardText = (text: string): void => {
  if (!text || text.trim().length === 0) {
    throw new ValidationError('Card list cannot be empty', 'text');
  }
  
  if (text.length > 10000) {
    throw new ValidationError('Card list is too long (max 10,000 characters)', 'text');
  }
};

// Retry utility for API calls
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Logging utility (can be extended with external logging service)
export const logError = (error: Error, context?: Record<string, any>): void => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
  
  // In production, you might want to send this to an external service
  // like Sentry, LogRocket, etc.
};

// Type guard for checking if error is operational
export const isOperationalError = (error: unknown): error is AppError => {
  return error instanceof AppError && error.isOperational;
};