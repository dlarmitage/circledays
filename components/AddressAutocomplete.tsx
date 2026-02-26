'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (address: ParsedAddress) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Module-level state so we only load the script once per page load
let mapsScriptState: 'idle' | 'loading' | 'ready' = 'idle';
const mapsReadyCallbacks: Array<() => void> = [];

function loadGoogleMaps(apiKey: string, onReady: () => void) {
  if (mapsScriptState === 'ready') { onReady(); return; }
  mapsReadyCallbacks.push(onReady);
  if (mapsScriptState === 'loading') return;

  mapsScriptState = 'loading';
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.onload = () => {
    mapsScriptState = 'ready';
    mapsReadyCallbacks.forEach(fn => fn());
    mapsReadyCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

export function AddressAutocomplete({ value, onChange, onPlaceSelect, placeholder, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mapsReady, setMapsReady] = useState(false);
  // Next.js exposes NEXT_PUBLIC_* vars at runtime in client components
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    const init = () => {
      setMapsReady(true);
      if (!inputRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = (window as any).google;
      if (!google?.maps?.places) return;

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.address_components) return;

        const get = (type: string, short = false): string =>
          place.address_components
            .find((c: { types: string[]; long_name: string; short_name: string }) => c.types.includes(type))
            ?.[short ? 'short_name' : 'long_name'] ?? '';

        const streetNumber = get('street_number');
        const route = get('route');
        const street = [streetNumber, route].filter(Boolean).join(' ');
        const city = get('locality') || get('sublocality_level_1');
        const state = get('administrative_area_level_1', true);
        const zip = get('postal_code');

        if (street) {
          onChange(street);
          onPlaceSelect({ street, city, state, zip });
        }
      });
    };

    loadGoogleMaps(apiKey, init);
  }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      {mapsReady && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin className="w-4 h-4 text-teal-500" />
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '123 Main St'}
        disabled={disabled}
        autoComplete={mapsReady ? 'off' : 'street-address'}
        {...(mapsReady ? { 'data-1p-ignore': true, 'data-lpignore': 'true' } : {})}
        className={`flex h-11 w-full rounded-xl border border-gray-200 bg-white text-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 ${mapsReady ? 'pl-9 pr-4' : 'px-4'}`}
      />
    </div>
  );
}
