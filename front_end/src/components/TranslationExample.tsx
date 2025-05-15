'use client';

import React from 'react';
import { useLanguage, t, DynamicText } from '@/contexts/LanguageContext';

const TranslationExample: React.FC = () => {
  const { language, isAutoTranslateEnabled } = useLanguage();

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">{t('language')} {t(`language.${language}`)}</h2>
      
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="font-medium text-gray-700">Static Translation (from translation files):</h3>
          <p className="mt-1">{t('dashboard.welcome')}</p>
        </div>
        
        <div className="border-b pb-2">
          <h3 className="font-medium text-gray-700">Dynamic Translation {isAutoTranslateEnabled ? '(enabled)' : '(disabled)'}:</h3>
          <p className="mt-1">
            <DynamicText 
              text="This text will be automatically translated when auto-translate is enabled and language is not English." 
            />
          </p>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-700">Mixed Content:</h3>
          <p className="mt-1">
            {t('dashboard.todayRevenue')}: <DynamicText text="$1,234.56" />
          </p>
        </div>
      </div>
    </div>
  );
};

export default TranslationExample;
