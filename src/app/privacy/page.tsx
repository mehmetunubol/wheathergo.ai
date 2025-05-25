
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Privacy Policy for Weatherugo</CardTitle>
          <CardDescription className="!mt-2">
            Effective Date: [Insert Date]
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>Welcome to Weatherugo (“we”, “our”, or “us”). Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our mobile or web application.</p>

          <section>
            <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
            <p>We collect the following information:</p>
            <p className="font-medium mt-2">Personal Information:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Email address (via standard authentication or OAuth)</li>
              <li>Name and profile photo (if provided through OAuth providers like Google)</li>
            </ul>
            <p className="font-medium mt-2">Device &amp; Usage Data (collected automatically):</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>IP address</li>
              <li>Browser type, device type, operating system</li>
            </ul>
            <p className="font-medium mt-2">User-Generated Content:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Inputs you provide to receive AI-generated suggestions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Authenticate and manage your account</li>
              <li>Provide personalized suggestions and weather data</li>
              <li>Improve and secure our services</li>
              <li>Respond to support requests</li>
            </ul>
            <p className="mt-2">We do not sell or share your data with third parties for advertising or marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Third-Party Services</h2>
            <p>We use the following third-party services to deliver core features:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>WeatherAPI – to retrieve local weather data</li>
              <li>Google OAuth / Apple Sign-In – for secure authentication</li>
              <li>Gemini AI (Google) – to generate suggestions based on user inputs</li>
            </ul>
            <p className="mt-2">Data sent to these services is strictly limited to what is required for functionality.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Data Storage and Retention</h2>
            <p>Your data is securely stored and retained as long as your account is active or as required by applicable law. You may request to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Delete your account</li>
              <li>Access or correct your data</li>
            </ul>
            <p className="mt-2">To do so, please contact: [Insert support email].</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Your Rights</h2>
            <p>Depending on your location (e.g., EU, California), you may have rights to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Access, modify, or delete your data</li>
              <li>Object to or restrict processing</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p className="mt-2">We honor all applicable data protection rights globally.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Children's Privacy</h2>
            <p>Weatherugo is not intended for users under the age of 13. We do not knowingly collect personal information from children without parental consent.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Changes to This Policy</h2>
            <p>We may update this Privacy Policy. We&apos;ll notify users of significant changes by posting a notice in the app.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Contact Us</h2>
            <p>Questions? Contact us at: [Insert your email]</p>
          </section>
          
          <div className="text-center pt-4">
            <Link href="/" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
