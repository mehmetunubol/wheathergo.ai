
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { MainNav } from '@/components/main-nav';
import { AuthProvider } from '@/hooks/use-auth';
import { AppSettingsProvider } from '@/contexts/app-settings-context'; // Added import
import GoogleAnalytics from '@/components/google-analytics';
import { Suspense } from 'react';

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
          <AppSettingsProvider> {/* Added AppSettingsProvider */}
            <MainNav />
            <main className="flex-grow container mx-auto max-w-2xl p-4">
              {children}
            </main>
            <footer className="text-center py-4 text-sm text-muted-foreground border-t mt-auto">
              <p>&copy; {new Date().getFullYear()} Weatherugo by Flow Teknoloji. Your personal guide for weather-based clothing and activity suggestions.</p>
            </footer>
          </AppSettingsProvider> {/* Added AppSettingsProvider */}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
