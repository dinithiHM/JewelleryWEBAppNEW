'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedLanguage, translateText } from '@/utils/translator';

// Define available languages
export type Language = 'en' | 'ta';

// Define the context type
type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  translations: Record<string, string>;
  translateDynamic: (text: string) => Promise<string>;
  isAutoTranslateEnabled: boolean;
  setAutoTranslateEnabled: (enabled: boolean) => void;
};

// Create the context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  translations: {},
  translateDynamic: async (text) => text,
  isAutoTranslateEnabled: false,
  setAutoTranslateEnabled: () => {},
});

// English translations
const enTranslations: Record<string, string> = {
  // Common
  'app.name': 'S Lanka Jewellery',
  'language.english': 'English',
  'language.tamil': 'Tamil',
  'language': 'Language',
  'language.autoTranslate': 'Auto Translate',

  // Menu items
  'menu.menu': 'MENU',
  'menu.other': 'OTHER',
  'menu.home': 'Home',
  'menu.storeManagers': 'Store Managers',
  'menu.salesAssociates': 'Sales Associates',
  'menu.cashiers': 'Cashiers',
  'menu.suppliers': 'Suppliers',
  'menu.supplierDetails': 'Supplier Details',
  'menu.orders': 'Orders',
  'menu.customOrders': 'Custom Orders',
  'menu.jewelleryItems': 'Jewellery Items',
  'menu.jewelleryStock': 'Jewellery Stock',
  'menu.goldStock': 'Gold Stock',
  'menu.categories': 'Categories',
  'menu.sales': 'Sales',
  'menu.salesReport': 'Sales Report',
  'menu.advancePayment': 'Advance Payment',
  'menu.finance': 'Finance',
  'menu.events': 'Events',
  'menu.profile': 'Profile',
  'menu.settings': 'Settings',
  'menu.logout': 'Logout',
  'menu.reports': 'Reports',
  'menu.notifications': 'Notifications',
  'menu.assayReports': 'Assay Reports',

  // Actions
  'action.add': 'Add',
  'action.edit': 'Edit',
  'action.delete': 'Delete',
  'action.view': 'View',
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.confirm': 'Confirm',

  // Form labels
  'form.name': 'Name',
  'form.email': 'Email',
  'form.phone': 'Phone',
  'form.address': 'Address',
  'form.password': 'Password',
  'form.confirmPassword': 'Confirm Password',

  // Dashboard
  'dashboard.welcome': 'Welcome',
  'dashboard.recentSales': 'Recent Sales',
  'dashboard.todayRevenue': 'Today\'s Revenue',
  'dashboard.monthlyRevenue': 'Monthly Revenue',
  'dashboard.employees': 'Employees',
  'dashboard.attendance': 'Attendance',
  'dashboard.stockLevels': 'Stock Levels',
  'dashboard.announcements': 'Announcements',
  'dashboard.viewAll': 'View All',
  'dashboard.noSalesFound': 'No sales found for this date',
  'dashboard.sale': 'Sales',
  'dashboard.jewelleryitem': 'Jewellery Items',
  'dashboard.storemanager': 'Store Managers',
  'dashboard.cashier': 'Cashiers',
  'dashboard.salesassociate': 'Sales Associates',
  'dashboard.todaystransactions': 'Today\'s Transactions',
  'dashboard.totalsales': 'Total Sales',
  'dashboard.cashbalance': 'Cash Balance',
  'dashboard.goldprice': 'Gold Price',
  'dashboard.todayssales': 'Today\'s Sales',
  'dashboard.customersserved': 'Customers Served',
  'dashboard.topcategory': 'Top Category',

  // Calendar
  'calendar.mon': 'MON',
  'calendar.tue': 'TUE',
  'calendar.wed': 'WED',
  'calendar.thu': 'THU',
  'calendar.fri': 'FRI',
  'calendar.sat': 'SAT',
  'calendar.sun': 'SUN',
};

// Tamil translations
const taTranslations: Record<string, string> = {
  // Common
  'app.name': 'எஸ் லங்கா நகைகள்',
  'language.english': 'ஆங்கிலம்',
  'language.tamil': 'தமிழ்',
  'language': 'மொழி',
  'language.autoTranslate': 'தானியங்கி மொழிபெயர்ப்பு',

  // Menu items
  'menu.menu': 'பட்டி',
  'menu.other': 'மற்றவை',
  'menu.home': 'முகப்பு',
  'menu.storeManagers': 'கடை மேலாளர்கள்',
  'menu.salesAssociates': 'விற்பனை சகாக்கள்',
  'menu.cashiers': 'காசாளர்கள்',
  'menu.suppliers': 'விநியோகஸ்தர்கள்',
  'menu.supplierDetails': 'விநியோகஸ்தர் விவரங்கள்',
  'menu.orders': 'ஆர்டர்கள்',
  'menu.customOrders': 'தனிப்பயன் ஆர்டர்கள்',
  'menu.jewelleryItems': 'நகை பொருட்கள்',
  'menu.jewelleryStock': 'நகை இருப்பு',
  'menu.goldStock': 'தங்க இருப்பு',
  'menu.categories': 'வகைகள்',
  'menu.sales': 'விற்பனைகள்',
  'menu.salesReport': 'விற்பனை அறிக்கை',
  'menu.advancePayment': 'முன்பணம்',
  'menu.finance': 'நிதி',
  'menu.events': 'நிகழ்வுகள்',
  'menu.profile': 'சுயவிவரம்',
  'menu.settings': 'அமைப்புகள்',
  'menu.logout': 'வெளியேறு',
  'menu.reports': 'அறிக்கைகள்',
  'menu.notifications': 'அறிவிப்புகள்',
  'menu.assayReports': 'தங்க சான்றிதழ் அறிக்கைகள்',

  // Actions
  'action.add': 'சேர்க்க',
  'action.edit': 'திருத்த',
  'action.delete': 'நீக்க',
  'action.view': 'பார்க்க',
  'action.save': 'சேமிக்க',
  'action.cancel': 'ரத்து செய்ய',
  'action.confirm': 'உறுதிப்படுத்த',

  // Form labels
  'form.name': 'பெயர்',
  'form.email': 'மின்னஞ்சல்',
  'form.phone': 'தொலைபேசி',
  'form.address': 'முகவரி',
  'form.password': 'கடவுச்சொல்',
  'form.confirmPassword': 'கடவுச்சொல்லை உறுதிப்படுத்துக',

  // Dashboard
  'dashboard.welcome': 'வரவேற்கிறோம்',
  'dashboard.recentSales': 'சமீபத்திய விற்பனைகள்',
  'dashboard.todayRevenue': 'இன்றைய வருவாய்',
  'dashboard.monthlyRevenue': 'மாதாந்திர வருவாய்',
  'dashboard.employees': 'ஊழியர்கள்',
  'dashboard.attendance': 'வருகைப்பதிவு',
  'dashboard.stockLevels': 'இருப்பு அளவுகள்',
  'dashboard.announcements': 'அறிவிப்புகள்',
  'dashboard.viewAll': 'அனைத்தையும் காண்க',
  'dashboard.noSalesFound': 'இந்த தேதிக்கு விற்பனைகள் எதுவும் இல்லை',
  'dashboard.sale': 'விற்பனைகள்',
  'dashboard.jewelleryitem': 'நகை பொருட்கள்',
  'dashboard.storemanager': 'கடை மேலாளர்கள்',
  'dashboard.cashier': 'காசாளர்கள்',
  'dashboard.salesassociate': 'விற்பனை சகாக்கள்',
  'dashboard.todaystransactions': 'இன்றைய பரிவர்த்தனைகள்',
  'dashboard.totalsales': 'மொத்த விற்பனை',
  'dashboard.cashbalance': 'பண இருப்பு',
  'dashboard.goldprice': 'தங்க விலை',
  'dashboard.todayssales': 'இன்றைய விற்பனைகள்',
  'dashboard.customersserved': 'சேவை செய்யப்பட்ட வாடிக்கையாளர்கள்',
  'dashboard.topcategory': 'சிறந்த வகை',

  // Calendar
  'calendar.mon': 'திங்',
  'calendar.tue': 'செவ்',
  'calendar.wed': 'புத',
  'calendar.thu': 'வியா',
  'calendar.fri': 'வெள்',
  'calendar.sat': 'சனி',
  'calendar.sun': 'ஞாயி',
};

// Map of languages to their translations
const translationMap = {
  en: enTranslations,
  ta: taTranslations,
};

// Provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize with English or the stored preference
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState(enTranslations);
  const [isAutoTranslateEnabled, setAutoTranslateEnabled] = useState(false);

  // Load saved language preference and auto-translate setting on component mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ta')) {
      setLanguage(savedLanguage);
      setTranslations(translationMap[savedLanguage]);
    }

    const autoTranslate = localStorage.getItem('autoTranslate');
    if (autoTranslate === 'true') {
      setAutoTranslateEnabled(true);
    }
  }, []);

  // Update translations when language changes
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    setTranslations(translationMap[lang]);
    localStorage.setItem('language', lang);
    // Update HTML lang attribute
    document.documentElement.lang = lang;
  };

  // Function to translate dynamic text
  const translateDynamic = async (text: string): Promise<string> => {
    if (!isAutoTranslateEnabled || language === 'en' || !text) {
      return text;
    }

    try {
      return await translateText(text, language as SupportedLanguage);
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  // Toggle auto-translate
  const handleSetAutoTranslateEnabled = (enabled: boolean) => {
    setAutoTranslateEnabled(enabled);
    localStorage.setItem('autoTranslate', enabled.toString());
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        translations,
        translateDynamic,
        isAutoTranslateEnabled,
        setAutoTranslateEnabled: handleSetAutoTranslateEnabled
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

// Translation helper function for static text (using predefined translations)
export const t = (key: string, context?: LanguageContextType) => {
  if (context) {
    const translation = context.translations[key];
    if (translation) {
      return translation;
    }
    return key;
  }

  // If used outside of context, try to get from the hook
  try {
    const { translations } = useLanguage();
    const translation = translations[key];
    if (translation) {
      return translation;
    }
    return key;
  } catch (error) {
    // Fallback to the key itself if context is not available
    return key;
  }
};

// Dynamic translation component for text that's not in the translation files
export const DynamicText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const { language, translateDynamic, isAutoTranslateEnabled } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    let isMounted = true;

    const translate = async () => {
      if (isAutoTranslateEnabled && language !== 'en') {
        const result = await translateDynamic(text);
        if (isMounted) {
          setTranslatedText(result);
        }
      } else {
        if (isMounted) {
          setTranslatedText(text);
        }
      }
    };

    translate();

    return () => {
      isMounted = false;
    };
  }, [text, language, translateDynamic, isAutoTranslateEnabled]);

  return <span className={className}>{translatedText}</span>;
};
