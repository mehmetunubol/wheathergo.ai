
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/use-translation";

export default function TermsOfServicePage() {
  const { t } = useTranslation();
  const contactEmail = "weatherugo@gmail.com";
  const effectiveDate = "May 25, 2024"; // You can make this dynamic if needed

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('termsTitleFull')}</CardTitle>
          <CardDescription className="!mt-2">
            {t('effectiveDate', { date: effectiveDate })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>{t('termsPageIntro')}</p>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('termsS1Title')}</h2>
            <p>{t('termsS1P1')}</p>
            <p className="font-medium mt-2">{t('termsS1ListIntro')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('termsS1L1')}</li>
              <li>{t('termsS1L2')}</li>
              <li>{t('termsS1L3')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('termsS2Title')}</h2>
            <p>{t('termsS2P1')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('termsS2L1')}</li>
              <li>{t('termsS2L2')}</li>
            </ul>
            <p className="mt-2">{t('termsS2P2')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('termsS3Title')}</h2>
            <p>{t('termsS3P1')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('termsS3L1')}</li>
              <li>{t('termsS3L2')}</li>
            </ul>
            <p className="mt-2">{t('termsS3P2')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('termsS4Title')}</h2>
            <p>{t('termsS4P1')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('termsS5Title')}</h2>
            <p>{t('termsS5P1')}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('termsS5L1')}</li>
              <li>{t('termsS5L2')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('termsS6Title')}</h2>
            <p>{t('termsS6P1')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('termsS7Title')}</h2>
            <p>{t('termsS7P1', { jurisdiction: t('termsS7P2Placeholder') })}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">{t('termsS8Title')}</h2>
            <p>{t('termsS8P1', { email: contactEmail })}</p>
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

    