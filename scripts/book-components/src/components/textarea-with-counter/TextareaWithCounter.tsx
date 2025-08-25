'use client';

import React, { useCallback, useState } from 'react';

interface TextareaWithCounterProps {
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export default function TextareaWithCounter({
  placeholder = "Start typing...",
  maxLength = 500,
  rows = 4,
  className = "",
  value: controlledValue,
  onChange
}: TextareaWithCounterProps) {
  const [internalValue, setInternalValue] = useState('');
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      if (controlledValue !== undefined) {
        onChange?.(newValue);
      } else {
        setInternalValue(newValue);
      }
    }
  }, [maxLength, controlledValue, onChange]);

  const wordCount = value.trim() === '' ? 0 : value.trim().split(/\s+/).length;
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.8;

  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 text-gray-900 placeholder-gray-500"
        />
        <div className="absolute bottom-3 right-3 flex items-center space-x-4 text-sm">
          <span className="text-gray-500">
            {wordCount} word{wordCount !== 1 ? 's' : ''}
          </span>
          <span className={`${isNearLimit ? 'text-orange-500' : 'text-gray-500'}`}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}
