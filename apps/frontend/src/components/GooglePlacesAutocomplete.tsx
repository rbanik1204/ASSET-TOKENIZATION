'use client';

import { useEffect, useRef, useState } from 'react';

interface LocationData {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  city?: string;
  country?: string;
}

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (locationData: LocationData) => void;
  placeholder?: string;
  className?: string;
}

// Extend Window interface for google
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Enter a location',
  className = ''
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      setError('Google Maps API key not configured');
      return;
    }

    // Check if script already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
      setError(null);
    };
    script.onerror = () => {
      setError('Failed to load Google Maps');
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) {
      return;
    }

    try {
      // Initialize autocomplete
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: ['formatted_address', 'geometry', 'place_id', 'address_components']
      });

      autocompleteRef.current = autocomplete;

      // Listen for place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.geometry || !place.geometry.location) {
          setError('No location data available for this place');
          return;
        }

        // Extract city and country from address components
        let city = '';
        let country = '';

        if (place.address_components) {
          for (const component of place.address_components) {
            if (component.types.includes('locality')) {
              city = component.long_name;
            } else if (component.types.includes('administrative_area_level_1') && !city) {
              city = component.long_name;
            }
            if (component.types.includes('country')) {
              country = component.long_name;
            }
          }
        }

        const locationData: LocationData = {
          address: place.formatted_address || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          placeId: place.place_id || '',
          city,
          country
        };

        onChange(locationData);
        setError(null);
      });
    } catch (err) {
      setError('Failed to initialize autocomplete');
      console.error('Autocomplete error:', err);
    }
  }, [isLoaded, onChange]);

  if (error) {
    return (
      <div>
        <input
          type="text"
          defaultValue={value}
          placeholder={placeholder}
          className={className}
          disabled
        />
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          ⚠️ {error} - Using manual entry
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div>
        <input
          type="text"
          defaultValue={value}
          placeholder={placeholder}
          className={className}
          disabled
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Loading location search...
        </p>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        className={className}
      />
      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
        ✓ Start typing to search locations
      </p>
    </div>
  );
}
