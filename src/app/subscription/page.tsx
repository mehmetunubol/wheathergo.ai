
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SubscriptionPage() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Subscription & Billing</CardTitle>
          <CardDescription className="!mt-2">
            Manage your Weatherugo subscription and payment details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-6 border rounded-md bg-muted/50">
            <p className="text-lg font-semibold text-foreground">Coming Soon!</p>
            <p className="text-muted-foreground mt-1">
              Advanced subscription features and payment options will be available here shortly.
              Thank you for your patience and interest in supporting Weatherugo!
            </p>
          </div>
          <Link href="/" passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
