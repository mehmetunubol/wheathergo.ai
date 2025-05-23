"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface GoogleAnalyticsProps {
  measurementId?: string;
}

/**
 * Sends a pageview event to Google Analytics.
 * @param url The URL of the page to track.
 * @param measurementId Your Google Analytics Measurement ID.
 */
export const pageview = (url: string, measurementId?: string) => {
  if (typeof window.gtag === "function" && measurementId) {
    window.gtag("config", measurementId, {
      page_path: url,
    });
  } else {
    // console.warn("gtag function not found or measurementId missing for pageview:", url);
  }
};

export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!measurementId) {
      // console.warn("Google Analytics Measurement ID is missing.");
      return;
    }
    // Construct the full URL including search parameters
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    pageview(url, measurementId);
  }, [pathname, searchParams, measurementId]);

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname + window.location.search,
            });
          `,
        }}
      />
    </>
  );
}

// Extend the Window interface to include gtag and dataLayer for TypeScript
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetIdOrEventName: string | Date,
      options?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}