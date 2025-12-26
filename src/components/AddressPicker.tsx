"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Search } from "lucide-react";

interface AddressPickerProps {
  value: string;
  onChange: (address: string, lat: number, lng: number) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressPicker({
  value,
  onChange,
  placeholder = "Enter your delivery address",
  className = "",
}: AddressPickerProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock address suggestions for demo purposes
  const mockAddresses = [
    "Damascus, Syria - Downtown",
    "Damascus, Syria - Old City",
    "Damascus, Syria - Mezzeh",
    "Damascus, Syria - Kafr Souseh",
    "Damascus, Syria - Al-Malki",
    "Damascus, Syria - Baramkeh",
    "Damascus, Syria - Mazzeh 86",
    "Damascus, Syria - Al-Qanawat",
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue, 33.5138, 36.2765); // Default Damascus coordinates

    if (inputValue.length > 2) {
      const filtered = mockAddresses.filter((addr) =>
        addr.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion, 33.5138, 36.2765); // Default Damascus coordinates
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.value = suggestion;
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 peer left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-5 w-5 text-blue-500" />
        </div>
        <input 
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-3 text-gray-900 font-medium placeholder:text-gray-500 placeholder:font-normal bg-white border-2 border-gray-300 rounded-lg transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:shadow-lg 
          hover:border-gray-400 sm:text-sm"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
            >
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                <span className="font-normal block truncate text-gray-900">
                  {suggestion}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


