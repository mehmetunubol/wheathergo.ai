
"use client";

import { useTranslation } from '@/hooks/use-translation';

export function FooterContent() {
  const { t } = useTranslation();
  return (
    <footer className="text-center py-4 text-sm text-muted-foreground border-t mt-auto">
      <p>{t('footerText', { year: new Date().getFullYear() })}</p>
    </footer>
  );
}
