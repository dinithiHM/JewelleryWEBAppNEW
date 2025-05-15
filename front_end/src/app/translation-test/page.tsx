'use client';

import React from 'react';
import LanguageSelector from '@/components/LanguageSelector';
import TranslationExample from '@/components/TranslationExample';
import { useLanguage, DynamicText } from '@/contexts/LanguageContext';

export default function TranslationTestPage() {
  const { language, isAutoTranslateEnabled } = useLanguage();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Translation Test Page</h1>
        <LanguageSelector />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TranslationExample />
        
        <div className="p-4 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Current Settings</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Current Language:</span> {language === 'en' ? 'English' : 'Tamil'}
            </p>
            <p>
              <span className="font-medium">Auto-Translate:</span> {isAutoTranslateEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          
          <div className="mt-6">
            <h3 className="font-medium mb-2">Dynamic Content Example:</h3>
            <div className="p-3 bg-gray-50 rounded border">
              <DynamicText text="This is a sample product description. It will be automatically translated when auto-translate is enabled and the language is set to Tamil." />
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-medium mb-2">Instructions:</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Select Tamil language from the dropdown</li>
              <li>Enable "Auto Translate" option</li>
              <li>Notice how dynamic content gets translated</li>
              <li>Static content uses predefined translations</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
