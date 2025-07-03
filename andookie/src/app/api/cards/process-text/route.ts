import { NextRequest, NextResponse } from 'next/server';

// Mock card database (same as in process-images)
const MOCK_CARD_DATABASE = [
  {
    id: 1,
    name: 'Charizard',
    set: 'Base Set',
    number: '4/102',
    marketPrice: 450.00,
    variants: ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played']
  },
  {
    id: 2,
    name: 'Pikachu VMAX',
    set: 'Vivid Voltage',
    number: '044/185',
    marketPrice: 85.00,
    variants: ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played']
  },
  {
    id: 3,
    name: 'Blastoise',
    set: 'Base Set',
    number: '2/102',
    marketPrice: 180.00,
    variants: ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played']
  },
  {
    id: 4,
    name: 'Venusaur',
    set: 'Base Set',
    number: '15/102',
    marketPrice: 120.00,
    variants: ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played']
  },
  {
    id: 5,
    name: 'Pikachu',
    set: 'Base Set',
    number: '58/102',
    marketPrice: 35.00,
    variants: ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played']
  },
  {
    id: 6,
    name: 'Alakazam',
    set: 'Base Set',
    number: '1/102',
    marketPrice: 90.00,
    variants: ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played']
  }
];

// Condition keywords to detect
const CONDITIONS = {
  'mint': 'Mint',
  'near mint': 'Near Mint',
  'nm': 'Near Mint',
  'lightly played': 'Lightly Played',
  'lp': 'Lightly Played',
  'moderately played': 'Moderately Played',
  'mp': 'Moderately Played',
  'heavily played': 'Heavily Played',
  'hp': 'Heavily Played',
  'damaged': 'Heavily Played'
};

// Function to parse individual card line
function parseCardLine(line: string) {
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;
  
  console.log(`Parsing line: "${trimmedLine}"`);
  
  // Convert to lowercase for matching
  const lowerLine = trimmedLine.toLowerCase();
  
  // Extract condition
  let condition = 'Near Mint'; // default
  for (const [keyword, conditionName] of Object.entries(CONDITIONS)) {
    if (lowerLine.includes(keyword)) {
      condition = conditionName;
      break;
    }
  }
  
  // Extract card number if present (format: 123/456 or #123)
  const numberMatch = trimmedLine.match(/(\d+\/\d+|#\d+)/);
  let cardNumber = '';
  if (numberMatch) {
    cardNumber = numberMatch[1].replace('#', '');
  }
  
  // Try to match card name and set
  let bestMatch = null;
  let highestScore = 0;
  
  for (const card of MOCK_CARD_DATABASE) {
    let score = 0;
    
    // Check if card name is in the line
    if (lowerLine.includes(card.name.toLowerCase())) {
      score += 3;
    }
    
    // Check if set is in the line
    if (lowerLine.includes(card.set.toLowerCase())) {
      score += 2;
    }
    
    // Check if card number matches
    if (cardNumber && card.number.includes(cardNumber)) {
      score += 2;
    }
    
    // Partial name matching
    const cardNameWords = card.name.toLowerCase().split(' ');
    for (const word of cardNameWords) {
      if (lowerLine.includes(word)) {
        score += 1;
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = card;
    }
  }
  
  if (bestMatch && highestScore >= 2) {
    // Calculate condition multiplier
    const conditionMultipliers = {
      'Mint': 1.1,
      'Near Mint': 1.0,
      'Lightly Played': 0.8,
      'Moderately Played': 0.6,
      'Heavily Played': 0.4
    };
    
    const conditionPrice = bestMatch.marketPrice * conditionMultipliers[condition as keyof typeof conditionMultipliers];
    const ourOffer = conditionPrice * 0.7; // 70% of market value
    
    return {
      id: bestMatch.id + Math.random(), // Unique ID for each instance
      name: bestMatch.name,
      set: bestMatch.set,
      number: bestMatch.number,
      condition,
      marketPrice: Math.round(conditionPrice * 100) / 100,
      ourOffer: Math.round(ourOffer * 100) / 100,
      confidence: highestScore / 5, // Confidence based on matching score
      originalText: trimmedLine
    };
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No text provided' },
        { status: 400 }
      );
    }
    
    console.log('Processing text input...');
    
    // Split text into lines
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid card entries found' },
        { status: 400 }
      );
    }
    
    // Process each line
    const processedCards = [];
    const unmatched = [];
    
    for (const line of lines) {
      const parsedCard = parseCardLine(line);
      if (parsedCard) {
        processedCards.push(parsedCard);
      } else {
        unmatched.push(line.trim());
      }
    }
    
    console.log(`Successfully processed ${processedCards.length} cards, ${unmatched.length} unmatched`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return NextResponse.json({
      success: true,
      data: {
        cards: processedCards,
        totalLines: lines.length,
        matched: processedCards.length,
        unmatched: unmatched,
        unmatchedLines: unmatched.length
      }
    });
    
  } catch (error) {
    console.error('Error processing text:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process text' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}