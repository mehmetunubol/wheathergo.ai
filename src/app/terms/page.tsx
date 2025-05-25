
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";

export default function TermsOfServicePage() {
  const { t } = useTranslation();
  // Placeholder date, replace with dynamic or actual date
  const effectiveDatePlaceholder = "[Insert Date]";

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('termsTitleFull')}</CardTitle>
          <CardDescription className="!mt-2">
            {t('effectiveDate', { date: effectiveDatePlaceholder })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>By using Weatherugo, you agree to these Terms of Service. Please read them carefully.</p>

          <section>
            <h2 className="text-lg font-semibold mb-2">1. Use of the App</h2>
            <p>You agree to use Weatherugo only for lawful purposes and in accordance with these terms.</p>
            <p className="font-medium mt-2">You must not:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Misuse or disrupt the app</li>
              <li>Use automated tools to scrape or interact with the platform</li>
              <li>Post harmful or misleading content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Account Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Keeping your login credentials secure</li>
              <li>All activity under your account</li>
            </ul>
            <p className="mt-2">We may suspend or terminate accounts that violate our policies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. AI Disclaimer</h2>
            <p>Our app uses Gemini AI to generate suggestions. These are:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>For informational purposes only</li>
              <li>Not medical, legal, or professional advice</li>
            </ul>
            <p className="mt-2">You are responsible for evaluating and using suggestions at your own discretion.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Third-Party Content</h2>
            <p>Weather data is sourced from WeatherAPI, and authentication may involve Google or Apple. We do not guarantee the accuracy or availability of third-party content or services.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Limitation of Liability</h2>
            <p>Weatherugo is provided “as is” without warranties. We are not liable for:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Errors in weather or AI-generated information</li>
              <li>Downtime, bugs, or losses resulting from app use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Changes to the Terms</h2>
            <p>We may revise these terms at any time. Continued use of the app means you accept the updated terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Governing Law</h2>
            <p>These terms are governed by the laws of [Insert Country]. You agree to resolve disputes in the courts of that jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Contact</h2>
            <p>For questions about these terms, contact: [Insert your email]</p>
          </section>
          
          <div className="text-center pt-4">
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToHome')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
