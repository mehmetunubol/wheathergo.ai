
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Chrome, Apple, Mail, KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  const router = useRouter();
  const { 
    loginWithGoogle, 
    loginWithApple, 
    loginWithEmailPassword,
    signUpWithEmailPassword,
    isAuthenticated, 
    isLoading 
  } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/'); 
    }
  }, [isAuthenticated, isLoading, router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing Fields", description: "Please enter both email and password.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await loginWithEmailPassword(email, password);
      // Successful login is handled by onAuthStateChanged in useAuth
    } catch (error: any) {
      console.error("Email sign-in error:", error);
      toast({
        title: "Sign In Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    // This function is triggered by the "Sign Up" button, not the form submission directly.
    // We prevent default in case it's ever part of a form that might submit.
    e.preventDefault(); 
    if (!email || !password) {
      toast({ title: "Missing Fields", description: "Please enter both email and password to sign up.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await signUpWithEmailPassword(email, password);
      // Successful sign-up is handled by onAuthStateChanged in useAuth
    } catch (error: any) {
      console.error("Email sign-up error:", error);
      toast({
        title: "Sign Up Failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


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
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
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
    return <div className="text-center p-10">Redirecting...</div>;
  }

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Weatherugo!</CardTitle>
          <CardDescription>Sign in or create an account to save your preferences and travel plans.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>
              <Button type="button" variant="outline" onClick={handleEmailSignUp} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing Up..." : "Sign Up"}
              </Button>
            </div>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button className="w-full" onClick={loginWithGoogle} disabled={isSubmitting}>
            <Chrome className="mr-2 h-5 w-5" /> 
            Sign in with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={loginWithApple} disabled={isSubmitting}>
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
