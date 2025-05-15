'use client';

import React, { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * A client component that provides language context to its children
 * Use this to wrap server components that need to be translated
 *
 * This component also handles automatic translation of the page content
 * when auto-translate is enabled.
 */
const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  // Use language context to trigger re-renders when language changes
  const { language, isAutoTranslateEnabled, translateDynamic } = useLanguage();

  // Effect to handle automatic translation of the entire page
  useEffect(() => {
    if (!isAutoTranslateEnabled || language === 'en') return;

    // This is a simple demonstration of how we could translate all text nodes
    // In a production app, you would want to be more selective about what gets translated
    const translateTextNodes = async () => {
      try {
        // Add data-no-auto-translate attribute to menu items and language selector
        document.querySelectorAll('.menu-item, .language-selector, [data-no-translate]').forEach(el => {
          el.setAttribute('data-no-auto-translate', 'true');
        });

        // Get all text nodes that are not inside script or style tags
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              // Skip empty text nodes
              if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;

              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;

              // Skip nodes that should not be translated
              if (
                // Skip script and style tags
                parent.tagName === 'SCRIPT' ||
                parent.tagName === 'STYLE' ||
                parent.tagName === 'NOSCRIPT' ||

                // Skip elements with specific attributes
                parent.hasAttribute('data-no-translate') ||
                parent.hasAttribute('data-translated') ||

                // Skip elements with specific classes
                parent.classList.contains('menu-item') ||
                parent.classList.contains('language-selector') ||
                parent.classList.contains('menu-item-text') ||

                // Skip elements inside specific containers
                parent.closest('.menu-item') ||
                parent.closest('.language-selector') ||
                parent.closest('[data-no-auto-translate]') ||

                // Skip form elements
                parent.tagName === 'SELECT' ||
                parent.tagName === 'OPTION' ||
                parent.tagName === 'INPUT' ||
                parent.tagName === 'TEXTAREA' ||
                parent.tagName === 'BUTTON'
              ) {
                return NodeFilter.FILTER_REJECT;
              }

              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        // Collect all text nodes to translate
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
          textNodes.push(node);
        }

        // Translate each text node
        // Note: In a real app, you'd want to batch these translations
        for (const node of textNodes) {
          if (node.textContent && node.textContent.trim().length > 3) {
            // Skip nodes that are already translated or are part of the menu
            const parent = node.parentElement;
            if (!parent) continue;

            // Skip if any parent has the no-translate attribute
            if (
              parent.hasAttribute('data-no-translate') ||
              parent.hasAttribute('data-translated') ||
              parent.hasAttribute('data-no-auto-translate') ||
              parent.closest('[data-no-translate]') ||
              parent.closest('[data-translated]') ||
              parent.closest('[data-no-auto-translate]')
            ) {
              continue;
            }

            try {
              const translated = await translateDynamic(node.textContent);
              node.textContent = translated;

              // Mark as translated to avoid re-translation
              parent.setAttribute('data-translated', 'true');
            } catch (err) {
              console.error('Error translating text:', node.textContent, err);
            }
          }
        }
      } catch (error) {
        console.error('Error translating page:', error);
      }
    };

    // Only run this when auto-translate is enabled and language is not English
    if (isAutoTranslateEnabled && language !== ('en' as typeof language)) {
      // Add a small delay to ensure the DOM is fully rendered
      const timeoutId = setTimeout(translateTextNodes, 500);

      // Clean up the timeout when the component unmounts or when dependencies change
      return () => clearTimeout(timeoutId);
    }
  }, [language, isAutoTranslateEnabled, translateDynamic]);

  return <>{children}</>;
};

export default TranslationProvider;
