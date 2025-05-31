
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const contactEmail = "support@weatherugo.com";
  const effectiveDate = "May 25, 2024"; // You can make this dynamic if needed


  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('privacyTitleFull')}</CardTitle>
          <CardDescription className="!mt-2">
            {t('effectiveDate', { date: effectiveDate })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>{t('privacyPageIntro')}</p>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('privacyS1Title')}</h2>
            <p>{t('privacyS1P1')}</p>
            <p className="font-medium mt-2">{t('privacyS1P2')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('privacyS1L1')}</li>
              <li>{t('privacyS1L2')}</li>
            </ul>
            <p className="font-medium mt-2">{t('privacyS1P3')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('privacyS1L3')}</li>
              <li>{t('privacyS1L4')}</li>
            </ul>
            <p className="font-medium mt-2">{t('privacyS1P4')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('privacyS1L5')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('privacyS2Title')}</h2>
            <p>{t('privacyS2P1')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('privacyS2L1')}</li>
              <li>{t('privacyS2L2')}</li>
              <li>{t('privacyS2L3')}</li>
              <li>{t('privacyS2L4')}</li>
            </ul>
            <p className="mt-2">{t('privacyS2P2')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('privacyS3Title')}</h2>
            <p>{t('privacyS3P1')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('privacyS3L1')}</li>
              <li>{t('privacyS3L2')}</li>
              <li>{t('privacyS3L3')}</li>
            </ul>
            <p className="mt-2">{t('privacyS3P2')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('privacyS4Title')}</h2>
            <p>{t('privacyS4P1')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('privacyS4L1')}</li>
              <li>{t('privacyS4L2')}</li>
            </ul>
            <p className="mt-2">{t('privacyS4P2', { email: contactEmail })}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('privacyS5Title')}</h2>
            <p>{t('privacyS5P1')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('privacyS5L1')}</li>
              <li>{t('privacyS5L2')}</li>
              <li>{t('privacyS5L3')}</li>
            </ul>
            <p className="mt-2">{t('privacyS5P2')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('privacyS6Title')}</h2>
            <p>{t('privacyS6P1')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('privacyS7Title')}</h2>
            <p>{t('privacyS7P1')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('privacyS8Title')}</h2>
            <p>{t('privacyS8P1', { email: contactEmail })}</p>
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

    