/**
 * Translator utility for automatic translation
 * This uses browser's built-in fetch API to call a free translation service
 */

// Define supported languages
export type SupportedLanguage = 'en' | 'ta';

// Cache for translations to avoid repeated API calls
const translationCache: Record<string, Record<string, string>> = {
  en: {},
  ta: {},
};

// Base URL for the free translation API
const TRANSLATION_API_URL = 'https://translate.googleapis.com/translate_a/single';

/**
 * Translates text to the target language
 * @param text Text to translate
 * @param targetLang Target language code
 * @param sourceLang Source language code (optional, auto-detected if not provided)
 * @returns Promise with translated text
 */
export const translateText = async (
  text: string,
  targetLang: SupportedLanguage,
  sourceLang: SupportedLanguage = 'en'
): Promise<string> => {
  // If target language is English and we're already in English, return the text
  if (targetLang === 'en' && sourceLang === 'en') {
    return text;
  }

  // If target language is Tamil and we're already in Tamil, return the text
  if (targetLang === 'ta' && sourceLang === 'ta') {
    return text;
  }

  // Check cache first
  if (translationCache[targetLang][text]) {
    return translationCache[targetLang][text];
  }

  try {
    // Use the free Google Translate API (client-side only)
    const params = new URLSearchParams({
      client: 'gtx',
      sl: sourceLang,
      tl: targetLang,
      dt: 't',
      q: text,
    });

    const response = await fetch(`${TRANSLATION_API_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Translation failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract translated text from the response
    // The response format is complex, but the translated text is in the first element
    // of the first array in the response
    let translatedText = '';
    if (data && data[0] && Array.isArray(data[0])) {
      translatedText = data[0]
        .filter((item: any) => item && item[0])
        .map((item: any) => item[0])
        .join('');
    }

    // Cache the translation
    translationCache[targetLang][text] = translatedText || text;
    
    return translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original text on error
  }
};

/**
 * Batch translate multiple texts
 * @param texts Array of texts to translate
 * @param targetLang Target language code
 * @param sourceLang Source language code (optional)
 * @returns Promise with array of translated texts
 */
export const batchTranslate = async (
  texts: string[],
  targetLang: SupportedLanguage,
  sourceLang: SupportedLanguage = 'en'
): Promise<string[]> => {
  // If target and source languages are the same, return the original texts
  if (targetLang === sourceLang) {
    return texts;
  }

  // Translate each text
  const promises = texts.map(text => translateText(text, targetLang, sourceLang));
  return Promise.all(promises);
};

/**
 * Translate HTML content preserving HTML tags
 * @param html HTML content to translate
 * @param targetLang Target language code
 * @param sourceLang Source language code (optional)
 * @returns Promise with translated HTML
 */
export const translateHtml = async (
  html: string,
  targetLang: SupportedLanguage,
  sourceLang: SupportedLanguage = 'en'
): Promise<string> => {
  // If target and source languages are the same, return the original HTML
  if (targetLang === sourceLang) {
    return html;
  }

  try {
    // Extract text content from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Get all text nodes
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent && node.textContent.trim()) {
        textNodes.push(node);
      }
    }
    
    // Translate each text node
    for (const node of textNodes) {
      if (node.textContent) {
        const translatedText = await translateText(
          node.textContent.trim(),
          targetLang,
          sourceLang
        );
        node.textContent = translatedText;
      }
    }
    
    return tempDiv.innerHTML;
  } catch (error) {
    console.error('HTML translation error:', error);
    return html; // Return original HTML on error
  }
};
