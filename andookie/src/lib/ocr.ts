import { 
    OCRResult, 
    CardDetection, 
    ImageProcessingResult, 
    CardCondition 
  } from './types';
  import { 
    OCRError, 
    InvalidImageError, 
    APIError,
    retryWithBackoff,
    logError 
  } from './errors';
  
  // Google Vision API types
  interface GoogleVisionTextAnnotation {
    description: string;
    boundingPoly: {
      vertices: Array<{ x: number; y: number }>;
    };
  }
  
  interface GoogleVisionResponse {
    textAnnotations: GoogleVisionTextAnnotation[];
    error?: {
      code: number;
      message: string;
    };
  }
  
  export class OCRService {
    private apiKey: string;
    private apiUrl: string;
  
    constructor() {
      this.apiKey = process.env.GOOGLE_VISION_API_KEY || '';
      this.apiUrl = 'https://vision.googleapis.com/v1/images:annotate';
      
      if (!this.apiKey) {
        console.warn('Google Vision API key not found. OCR will use mock data.');
      }
    }
  
    async processImage(imageBuffer: Buffer): Promise<ImageProcessingResult> {
      const startTime = Date.now();
      
      try {
        // Validate image
        this.validateImage(imageBuffer);
        
        // Use mock data if no API key
        if (!this.apiKey) {
          return this.getMockOCRResult();
        }
        
        // Call Google Vision API
        const ocrResults = await this.callGoogleVisionAPI(imageBuffer);
        
        // Extract card information from OCR results
        const cardDetections = this.extractCardInfo(ocrResults);
        
        return {
          cardDetections,
          ocrResults,
          processingTime: Date.now() - startTime
        };
        
      } catch (error) {
        logError(error as Error, { 
          service: 'OCR',
          processingTime: Date.now() - startTime 
        });
        throw error;
      }
    }
  
    private validateImage(imageBuffer: Buffer): void {
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new InvalidImageError('Image buffer is empty');
      }
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (imageBuffer.length > maxSize) {
        throw new InvalidImageError('Image size exceeds 10MB limit');
      }
      
      // Check if it's a valid image by looking at magic bytes
      const isPNG = imageBuffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
      const isJPEG = imageBuffer.subarray(0, 2).equals(Buffer.from([0xFF, 0xD8]));
      const isWebP = imageBuffer.subarray(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) && 
                     imageBuffer.subarray(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]));
      
      if (!isPNG && !isJPEG && !isWebP) {
        throw new InvalidImageError('Invalid image format. Only PNG, JPEG, and WebP are supported');
      }
    }
  
    private async callGoogleVisionAPI(imageBuffer: Buffer): Promise<OCRResult[]> {
      const base64Image = imageBuffer.toString('base64');
      
      const requestBody = {
        requests: [{
          image: { content: base64Image },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 50 },
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 50 }
          ]
        }]
      };
      
      const response = await retryWithBackoff(async () => {
        const result = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!result.ok) {
          throw new APIError(`Google Vision API error: ${result.status} ${result.statusText}`);
        }
        
        return result.json();
      });
      
      const visionResponse = response.responses[0] as GoogleVisionResponse;
      
      if (visionResponse.error) {
        throw new OCRError(`Google Vision API error: ${visionResponse.error.message}`);
      }
      
      if (!visionResponse.textAnnotations || visionResponse.textAnnotations.length === 0) {
        return [];
      }
      
      return visionResponse.textAnnotations.map(annotation => ({
        text: annotation.description,
        confidence: 0.9, // Google Vision doesn't provide confidence scores for text detection
        boundingBox: this.convertBoundingBox(annotation.boundingPoly)
      }));
    }
  
    private convertBoundingBox(boundingPoly: any): { x: number; y: number; width: number; height: number } {
      const vertices = boundingPoly.vertices;
      if (!vertices || vertices.length < 4) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      
      const xs = vertices.map((v: any) => v.x || 0);
      const ys = vertices.map((v: any) => v.y || 0);
      
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    }
  
    private extractCardInfo(ocrResults: OCRResult[]): CardDetection[] {
      const detections: CardDetection[] = [];
      
      if (ocrResults.length === 0) {
        return detections;
      }
      
      // Combine all text for analysis
      const allText = ocrResults.map(result => result.text).join(' ').toLowerCase();
      
      // Common Pokémon card patterns
      const cardNamePatterns = [
        /\b(charizard|pikachu|blastoise|venusaur|alakazam|mewtwo|mew|dragonite|gyarados|machamp|gengar|articuno|zapdos|moltres)\b/gi,
        /\b\w+\s+(v|vmax|gx|ex|prime|star|delta|crystal)\b/gi
      ];
      
      const setPatterns = [
        /\b(base set|jungle|fossil|team rocket|gym|neo|e-card|ex|diamond|pearl|platinum|black|white|xy|sun|moon|sword|shield|brilliant|astral|lost|silver|paldea|obsidian|crown|chilling|battle|vivid|darkness|rebel|pokemon go)\b/gi
      ];
      
      const numberPatterns = [
        /\b(\d{1,3}\/\d{1,3})\b/g,
        /\b#(\d{1,3})\b/g
      ];
      
      const conditionPatterns = [
        /\b(mint|near mint|nm|lightly played|lp|moderately played|mp|heavily played|hp|damaged|poor)\b/gi
      ];
      
      // Extract card names
      const cardNames: string[] = [];
      for (const pattern of cardNamePatterns) {
        const matches = allText.match(pattern);
        if (matches) {
          cardNames.push(...matches);
        }
      }
      
      // Extract sets
      const sets: string[] = [];
      for (const pattern of setPatterns) {
        const matches = allText.match(pattern);
        if (matches) {
          sets.push(...matches);
        }
      }
      
      // Extract card numbers
      const numbers: string[] = [];
      for (const pattern of numberPatterns) {
        const matches = allText.match(pattern);
        if (matches) {
          numbers.push(...matches);
        }
      }
      
      // Extract conditions
      const conditions: string[] = [];
      for (const pattern of conditionPatterns) {
        const matches = allText.match(pattern);
        if (matches) {
          conditions.push(...matches);
        }
      }
      
      // Create detections based on found information
      const maxDetections = Math.max(cardNames.length, 1);
      
      for (let i = 0; i < maxDetections; i++) {
        const detection: CardDetection = {
          cardName: cardNames[i] || undefined,
          setName: sets[i] || sets[0] || undefined,
          cardNumber: numbers[i] || numbers[0] || undefined,
          condition: this.normalizeCondition(conditions[i] || conditions[0]),
          confidence: this.calculateConfidence(cardNames[i], sets[i], numbers[i]),
          boundingBox: ocrResults[0]?.boundingBox // Use first result's bounding box as fallback
        };
        
        detections.push(detection);
      }
      
      return detections;
    }
  
    private normalizeCondition(condition?: string): CardCondition | undefined {
      if (!condition) return undefined;
      
      const normalized = condition.toLowerCase().trim();
      
      if (normalized.includes('mint') && !normalized.includes('near')) return 'Mint';
      if (normalized.includes('near mint') || normalized === 'nm') return 'Near Mint';
      if (normalized.includes('lightly played') || normalized === 'lp') return 'Lightly Played';
      if (normalized.includes('moderately played') || normalized === 'mp') return 'Moderately Played';
      if (normalized.includes('heavily played') || normalized === 'hp') return 'Heavily Played';
      if (normalized.includes('damaged') || normalized.includes('poor')) return 'Heavily Played';
      
      return undefined;
    }
  
    private calculateConfidence(cardName?: string, setName?: string, cardNumber?: string): number {
      let confidence = 0;
      
      // Base confidence for having any text
      confidence += 0.1;
      
      // Confidence boost for card name
      if (cardName) {
        confidence += 0.4;
        
        // Extra boost for known Pokémon names
        const knownPokemon = [
          'charizard', 'pikachu', 'blastoise', 'venusaur', 'alakazam', 
          'mewtwo', 'mew', 'dragonite', 'gyarados', 'machamp', 'gengar',
          'articuno', 'zapdos', 'moltres'
        ];
        
        if (knownPokemon.some(pokemon => cardName.toLowerCase().includes(pokemon))) {
          confidence += 0.2;
        }
      }
      
      // Confidence boost for set name
      if (setName) {
        confidence += 0.3;
      }
      
      // Confidence boost for card number
      if (cardNumber) {
        confidence += 0.2;
        
        // Extra boost for proper format (e.g., "1/102")
        if (cardNumber.includes('/')) {
          confidence += 0.1;
        }
      }
      
      // Cap confidence at 1.0
      return Math.min(confidence, 1.0);
    }
  
    private getMockOCRResult(): ImageProcessingResult {
      const mockOCRResults: OCRResult[] = [
        {
          text: 'Charizard VMAX',
          confidence: 0.95,
          boundingBox: { x: 50, y: 30, width: 200, height: 40 }
        },
        {
          text: 'Champion\'s Path',
          confidence: 0.88,
          boundingBox: { x: 50, y: 80, width: 150, height: 25 }
        },
        {
          text: '74/73',
          confidence: 0.92,
          boundingBox: { x: 200, y: 300, width: 60, height: 20 }
        },
        {
          text: 'Near Mint',
          confidence: 0.85,
          boundingBox: { x: 50, y: 350, width: 100, height: 20 }
        }
      ];
      
      const mockCardDetections: CardDetection[] = [
        {
          cardName: 'Charizard VMAX',
          setName: 'Champion\'s Path',
          cardNumber: '74/73',
          condition: 'Near Mint',
          confidence: 0.9,
          boundingBox: { x: 50, y: 30, width: 200, height: 320 }
        }
      ];
      
      return {
        cardDetections: mockCardDetections,
        ocrResults: mockOCRResults,
        processingTime: 150
      };
    }
    
    /**
     * Clean up OCR text by removing common artifacts and normalizing format
     */
    private cleanOCRText(text: string): string {
      return text
        .replace(/[^\w\s\/\-\.]/g, '') // Remove special characters except common card text
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }
    
    /**
     * Extract rarity information from OCR text
     */
    private extractRarity(text: string): string | undefined {
      const rarityPatterns = [
        /\b(common|uncommon|rare|ultra rare|secret rare|rainbow rare|gold rare|promo)\b/gi
      ];
      
      for (const pattern of rarityPatterns) {
        const match = text.match(pattern);
        if (match) {
          return match[0];
        }
      }
      
      return undefined;
    }
    
    /**
     * Extract HP value from OCR text
     */
    private extractHP(text: string): number | undefined {
      const hpPattern = /\b(\d{1,3})\s*hp\b/gi;
      const match = text.match(hpPattern);
      
      if (match) {
        const hpValue = parseInt(match[0].replace(/\D/g, ''), 10);
        return isNaN(hpValue) ? undefined : hpValue;
      }
      
      return undefined;
    }
  }