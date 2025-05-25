
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
import { FooterContent } from '@/components/footer-content'; // Import the new client component

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Weatherugo',
  description: 'Your personal guide for weather-based clothing and activity suggestions.',
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
        <AuthProvider>
          <LanguageProvider>
            <AppSettingsProvider>
              <MainNav />
              <main className="flex-grow container mx-auto max-w-2xl p-4">
                {children}
              </main>
              <FooterContent /> {/* Use the new client component */}
            </AppSettingsProvider>
          </LanguageProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
