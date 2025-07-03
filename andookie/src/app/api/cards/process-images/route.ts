'use client';

import React, { useState } from 'react';
import { Camera, Upload, DollarSign, Package, CheckCircle, X } from 'lucide-react';

interface UploadedImage {
  id: number;
  file: File;
  url: string;
  name: string;
}

interface Card {
  id: number;
  name: string;
  set: string;
  number: string;
  condition: string;
  marketPrice: number;
  ourOffer: number;
  image?: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [identifiedCards, setIdentifiedCards] = useState<Card[]>([]);
  const [showOffer, setShowOffer] = useState(false);
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock card data for demonstration
  const mockCards: Card[] = [
    {
      id: 1,
      name: 'Charizard',
      set: 'Base Set',
      number: '4/102',
      condition: 'Near Mint',
      marketPrice: 450.00,
      ourOffer: 315.00,
    },
    {
      id: 2,
      name: 'Pikachu VMAX',
      set: 'Vivid Voltage',
      number: '044/185',
      condition: 'Mint',
      marketPrice: 85.00,
      ourOffer: 59.50,
    },
    {
      id: 3,
      name: 'Blastoise',
      set: 'Base Set',
      number: '2/102',
      condition: 'Lightly Played',
      marketPrice: 180.00,
      ourOffer: 108.00,
    }
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newImages: UploadedImage[] = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setUploadedImages([...uploadedImages, ...newImages]);
  };

  const removeImage = (id: number) => {
    setUploadedImages(uploadedImages.filter(img => img.id !== id));
  };

  const processCards = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      uploadedImages.forEach(image => {
        formData.append('images', image.file);
      });

      const response = await fetch('/api/cards/process-images', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setIdentifiedCards(result.data.cards);
        setShowOffer(true);
      } else {
        alert('Error processing images: ' + result.error);
      }
    } catch (error) {
      console.error('Error processing cards:', error);
      alert('Failed to process images. Please try again.');
    }
    setLoading(false);
  };

  const processTextInput = async () => {
    if (!textInput.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/cards/process-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textInput })
      });

      const result = await response.json();
      
      if (result.success) {
        setIdentifiedCards(result.data.cards);
        setShowOffer(true);
        if (result.data.unmatchedLines > 0) {
          alert(`Note: ${result.data.unmatchedLines} lines couldn't be matched to cards in our database.`);
        }
      } else {
        alert('Error processing text: ' + result.error);
      }
    } catch (error) {
      console.error('Error processing text:', error);
      alert('Failed to process card list. Please try again.');
    }
    setLoading(false);
  };

  const acceptOffer = () => {
    setOfferAccepted(true);
    // Here you would integrate with shipping API
  };

  const totalOffer = identifiedCards.reduce((sum, card) => sum + card.ourOffer, 0);
  const totalMarketValue = identifiedCards.reduce((sum, card) => sum + card.marketPrice, 0);

  if (offerAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Offer Accepted!</h1>
            <p className="text-lg text-gray-600 mb-6">
              Your offer of <span className="font-bold text-green-600">${totalOffer.toFixed(2)}</span> has been accepted.
            </p>
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-800 mb-2">Next Steps:</h3>
              <ul className="text-left text-gray-600 space-y-2">
                <li>✓ Prepaid shipping label sent to your email</li>
                <li>✓ Pack your cards securely using our instructions</li>
                <li>✓ Drop off at any UPS location</li>
                <li>✓ Payment processed within 24 hours of receipt</li>
              </ul>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sell More Cards
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showOffer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Card Offer</h1>
            
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Market Value</p>
                  <p className="text-xl font-semibold text-gray-800">${totalMarketValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Our Offer (70% of market)</p>
                  <p className="text-3xl font-bold text-green-600">${totalOffer.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 mb-6">
              {identifiedCards.map(card => (
                <div key={card.id} className="border rounded-lg p-4 flex items-center space-x-4">
                  <div className="w-16 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs text-gray-500">Card</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{card.name}</h3>
                    <p className="text-sm text-gray-600">{card.set} #{card.number}</p>
                    <p className="text-sm text-gray-500">Condition: {card.condition}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Market: ${card.marketPrice.toFixed(2)}</p>
                    <p className="font-semibold text-green-600">Our Offer: ${card.ourOffer.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={acceptOffer}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Accept Offer - ${totalOffer.toFixed(2)}
              </button>
              <button
                onClick={() => setShowOffer(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Sell Your Pokémon Cards</h1>
          <p className="text-gray-600">Get instant cash offers for your collection</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="w-5 h-5 inline mr-2" />
              Upload Photos
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'text'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="inline-block w-5 h-5 mr-2 text-center">📝</span>
              Type Card List
            </button>
          </div>
        </div>

        {/* Upload Photos Tab */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Card Photos</h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Take clear photos of your cards (front and back if possible)
              </p>
              <label className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-block">
                Choose Files
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedImages.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Uploaded Images ({uploadedImages.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadedImages.map(image => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={processCards}
              disabled={uploadedImages.length === 0 || loading}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing Cards...' : `Get Offer for ${uploadedImages.length} Images`}
            </button>
          </div>
        )}

        {/* Text Input Tab */}
        {activeTab === 'text' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Enter Card List</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card List (one per line)
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Example:&#10;Charizard Base Set Near Mint&#10;Pikachu VMAX 044/185 Mint&#10;Blastoise Base Set Lightly Played"
                rows={8}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Formatting Tips:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Include card name, set, and condition when possible</li>
                <li>• Example: "Charizard Base Set Near Mint"</li>
                <li>• Example: "Pikachu V 043/185 Mint"</li>
                <li>• One card per line</li>
              </ul>
            </div>

            <button
              onClick={processTextInput}
              disabled={!textInput.trim() || loading}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing Cards...' : 'Get Offer for Card List'}
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-center text-gray-600">
                {activeTab === 'upload' ? 'Analyzing your card images...' : 'Processing your card list...'}
              </p>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Submit Cards</h3>
              <p className="text-sm text-gray-600">Upload photos or type card names</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Get Instant Offer</h3>
              <p className="text-sm text-gray-600">AI identifies cards and calculates fair market value</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Ship for Free</h3>
              <p className="text-sm text-gray-600">We provide prepaid shipping labels</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <span className="text-blue-600 font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-2">Get Paid</h3>
              <p className="text-sm text-gray-600">Receive payment within 24 hours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}