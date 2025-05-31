
"use client";

import Link from "next/link";
import { Instagram, Linkedin } from "lucide-react"; // Corrected import names
import { useTranslation } from '@/hooks/use-translation';

export function FooterContent() {
  const { t } = useTranslation();
  return (
    <footer className="border-t bg-background text-sm text-muted-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Left: Copyright */}
          <p className="text-center md:text-left">
            {t('footerCopyright', { year: new Date().getFullYear() })}
          </p>

          {/* Middle: Links - flex-col on mobile, flex-row on md+ */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-start">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              {t('privacyPolicyShort')}
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              {t('termsOfServiceShort')}
            </Link>
            <a href="mailto:support@weatherugo.com" className="hover:text-primary transition-colors">
              {t('supportLinkText')}
            </a>
          </nav>

          {/* Right: Social Icons */}
          <div className="flex items-center gap-4">
            <a 
              href="https://www.instagram.com/weatherugo?igsh=MTNhN3U5eWh1bHJ1aA==" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label={t('instagramAltText')} 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a 
              href="https://www.linkedin.com/company/weatherugo/about/" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label={t('linkedinAltText')}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
