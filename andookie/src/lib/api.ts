import { Card, UploadedImage } from './types';

export const processImages = async (images: UploadedImage[]): Promise<Card[]> => {
  // TODO: Implement actual OCR and card recognition
  const formData = new FormData();
  images.forEach(img => formData.append('images', img.file));
  
  const response = await fetch('/api/cards/process-images', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};

export const processTextList = async (text: string): Promise<Card[]> => {
  // TODO: Implement text parsing
  const response = await fetch('/api/cards/process-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  
  return response.json();
};