
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Chrome, Apple } from "lucide-react"; 
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogle, loginWithApple, isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/'); 
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full mt-2" />
          </CardContent>
          <CardFooter className="flex flex-col items-center text-center">
             <Skeleton className="h-4 w-3/4" />
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (isAuthenticated) {
    // This case should be handled by useEffect redirect, but as a fallback:
    return <div className="text-center p-10">Redirecting...</div>;
  }

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Weatherugo!</CardTitle>
          <CardDescription>Sign in to save your preferences and travel plans.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={loginWithGoogle}>
            <Chrome className="mr-2 h-5 w-5" /> 
            Sign in with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={loginWithApple}>
            <Apple className="mr-2 h-5 w-5" />
            Sign in with Apple (Simulated)
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
                Apple Sign-In is currently simulated and will use Google Sign-In.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
