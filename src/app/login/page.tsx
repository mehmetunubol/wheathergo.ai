"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Chrome, Apple } from "lucide-react"; // Using Chrome as a generic icon for Google

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/'); // Redirect if already logged in
    }
  }, [isAuthenticated, router]);

  const handleLogin = (provider: 'google' | 'apple') => {
    login(provider); // This is the placeholder login
    // router.push('/'); // AuthProvider will redirect or you can do it here
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
          <CardDescription>Sign in to access your Weatherugo Guide.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={() => handleLogin('google')}>
            <Chrome className="mr-2 h-5 w-5" /> {/* Using Chrome icon for Google */}
            Sign in with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={() => handleLogin('apple')}>
            <Apple className="mr-2 h-5 w-5" />
            Sign in with Apple
          </Button>
          <p className="px-8 text-center text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
            .
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-center">
            <p className="text-xs text-muted-foreground">
                Note: Authentication is simulated. Clicking a button will "log you in" locally.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
