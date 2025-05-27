
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox import
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Chrome, Apple, Mail, KeyRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";

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
  const { t } = useTranslation();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [agreedToTerms, setAgreedToTerms] = React.useState(false); // State for terms agreement
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/'); 
    }
  }, [isAuthenticated, isLoading, router]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: t('error'), description: t('validationErrorEmailPasswordRequired'), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await loginWithEmailPassword(email, password);
    } catch (error: any) {
      console.error("Email sign-in error:", error);
      toast({
        title: t('signIn') + " " + t('error'),
        description: error.message || t('authErrorDefault'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!email || !password) {
      toast({ title: t('error'), description: t('validationErrorEmailPasswordSignUpRequired'), variant: "destructive" });
      return;
    }
    if (!agreedToTerms) {
      toast({
        title: t('error'),
        description: t('mustAgreeToTermsError'),
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await signUpWithEmailPassword(email, password);
    } catch (error: any) {
      console.error("Email sign-up error:", error);
      toast({
        title: t('signUp') + " " + t('error'),
        description: error.message || t('authErrorDefault'),
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
          <CardTitle className="text-2xl font-bold">{t('welcomeToWeatherugo')}</CardTitle>
          <CardDescription>{t('loginDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={loginWithGoogle} disabled={isSubmitting}>
            <Chrome className="mr-2 h-5 w-5" /> 
            {t('signInWithGoogle')}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder={t('emailPlaceholder')} 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">{t('passwordLabel')}</Label>
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

            {/* Terms Agreement Checkbox */}
            <div className="items-top flex space-x-2 pt-2">
              <Checkbox
                id="terms-agreement-checkbox"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                disabled={isSubmitting}
                aria-label={t('agreeToTermsCheckboxAriaLabel')}
              />
              <div className="grid gap-1.5 leading-none text-center text-sm text-muted-foreground">
                <label
                  htmlFor="terms-agreement-checkbox"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {t('agreeToTermsPreamble')}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer">
                    <span className="underline underline-offset-4 hover:text-primary">
                      {t('termsOfService')}
                    </span>
                  </Link>
                  {t('agreeToTermsConjunction')}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                    <span className="underline underline-offset-4 hover:text-primary">
                      {t('privacyPolicy')}
                    </span>
                  </Link>
                  {t('agreeToTermsPostamble')}
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('saving') : t('signIn')}
              </Button>
              <Button type="button" variant="outline" onClick={handleEmailSignUp} className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('saving') : t('signUp')}
              </Button>
            </div>
          </form>
          {/*<Button variant="outline" className="w-full" onClick={loginWithApple} disabled={isSubmitting}>
            <Apple className="mr-2 h-5 w-5" />
            {t('signInWithApple')}
          </Button>*/}
          
        </CardContent>
         {/*<CardFooter className="flex flex-col items-center text-center">
            <p className="text-xs text-muted-foreground">
                {t('appleSignInSimulated')}
            </p>
        </CardFooter>*/}
      </Card>
    </div>
  );
}
