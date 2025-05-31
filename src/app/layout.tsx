
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { MainNav } from '@/components/main-nav';
import { AuthProvider } from '@/hooks/use-auth';
import { AppSettingsProvider } from '@/contexts/app-settings-context';
import { LanguageProvider } from '@/contexts/language-context'; 
import GoogleAnalytics from '@/components/google-analytics';
import { Suspense } from 'react';
import { FooterContent } from '@/components/footer-content';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadata cannot be dynamic with "use client", so we keep it static
// If dynamic metadata is needed, this component needs refactoring or metadata can be set in child pages
export const metadata: Metadata = {
  title: 'Weatherugo',
  description: 'Your personal guide for weather-based clothing and activity suggestions.',
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION_ID,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      {gaMeasurementId && (
        <Suspense fallback={null}>
          <GoogleAnalytics measurementId={gaMeasurementId} />
        </Suspense>
      )}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <LanguageProvider>
          <AuthProvider>
            <AppSettingsProvider>
              <MainNav />
              <main className="flex-grow"> {/* Removed container, mx-auto, max-w-2xl, p-4 */}
                {children}
              </main>
              <FooterContent />
            </AppSettingsProvider>
          </AuthProvider>
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  );
}
