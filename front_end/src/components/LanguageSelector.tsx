'use client';

import React from 'react';
import { useLanguage, t } from '@/contexts/LanguageContext';
import { MdLanguage, MdTranslate } from 'react-icons/md';
import { Switch } from '@/components/ui/Switch';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, isAutoTranslateEnabled, setAutoTranslateEnabled } = useLanguage();

  return (
    <div className="relative inline-block text-left language-selector" data-no-auto-translate="true">
      <div className="flex flex-col gap-2 language-selector" data-no-auto-translate="true">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-100 hover:bg-yellow-200 cursor-pointer border border-yellow-300 language-selector" data-no-auto-translate="true">
          <MdLanguage size={20} className="text-yellow-800" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ta')}
            className="bg-transparent border-none outline-none text-yellow-800 cursor-pointer font-medium language-selector"
            title="Select Language / மொழியைத் தேர்ந்தெடுக்கவும்"
            data-no-auto-translate="true"
          >
            <option value="en" data-no-auto-translate="true">{t('language.english')}</option>
            <option value="ta" data-no-auto-translate="true">{t('language.tamil')}</option>
          </select>
        </div>

        {language !== 'en' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-50 border border-yellow-200 language-selector" data-no-auto-translate="true">
            <MdTranslate size={18} className="text-yellow-800" />
            <span className="text-sm text-yellow-800 language-selector" data-no-auto-translate="true">{t('language.autoTranslate')}</span>
            <Switch
              checked={isAutoTranslateEnabled}
              onCheckedChange={setAutoTranslateEnabled}
              className="ml-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageSelector;
