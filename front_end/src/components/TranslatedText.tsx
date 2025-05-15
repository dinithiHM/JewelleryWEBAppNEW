'use client';

import React from 'react';
import { t, useLanguage } from '@/contexts/LanguageContext';

interface TranslatedTextProps {
  textKey: string;
  fallback?: string;
  className?: string;
}

/**
 * A component that displays translated text based on the current language
 */
const TranslatedText: React.FC<TranslatedTextProps> = ({ 
  textKey, 
  fallback, 
  className 
}) => {
  // Use language context to trigger re-renders when language changes
  useLanguage();
  
  return (
    <span className={className}>
      {t(textKey) || fallback || textKey}
    </span>
  );
};

export default TranslatedText;
