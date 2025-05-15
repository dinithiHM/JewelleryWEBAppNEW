'use client';

import { LanguageProvider } from "@/contexts/LanguageContext";

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}
