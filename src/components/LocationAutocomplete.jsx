import React, { useState, useRef } from 'react';
import { MapPin } from 'lucide-react';

export default function LocationAutocomplete({ value, onChange, placeholder, iconColor = "#3FA9F5", required = true }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 4) {
      setSuggestions([]);
      return;
    }
    try {
      // Usamos countrycodes=ar para mejorar la precisión local
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ar`);
      const data = await res.json();
      setSuggestions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
      setShowSuggestions(true);
    }, 700);
  };

  const handleSelect = (s) => {
    // Tomamos el display_name, podemos limpiarlo si es muy largo, pero por ahora tal cual.
    onChange(s.display_name);
    setShowSuggestions(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <MapPin size={16} color={iconColor} style={{ position: 'absolute', left: 10, top: 12 }} />
      <input 
        type="text" required={required} value={value} onChange={handleInputChange}
        onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        style={{ width: '100%', background: '#0B0F14', border: '1px solid #2A2F36', borderRadius: 6, padding: '10px 12px 10px 32px', color: '#E5E7EB', outline: 'none' }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1F26', border: '1px solid #3FA9F5', borderRadius: 6, marginTop: 4, zIndex: 1000, maxHeight: 220, overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          {suggestions.map(s => (
            <div 
              key={s.place_id} 
              onClick={() => handleSelect(s)}
              style={{ padding: '10px 12px', fontSize: 12, color: '#E5E7EB', cursor: 'pointer', borderBottom: '1px solid #2A2F36', lineHeight: 1.4 }}
              onMouseOver={e => e.currentTarget.style.background = '#2A2F36'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              {s.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
