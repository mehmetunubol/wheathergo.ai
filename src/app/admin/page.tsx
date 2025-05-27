
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ListChecks, Settings, Newspaper } from "lucide-react"; // Added Newspaper
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export default function AdminDashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('adminDashboardTitle')}</h1>
      <p className="text-muted-foreground">
        {t('adminDashboardDescription')}
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Users className="text-primary"/> {t('userManagementCardTitle')}</CardTitle>
            <CardDescription>{t('userManagementCardDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/users" passHref>
              <Button variant="outline" className="mt-2 w-full">{t('manageUsersButton')}</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Newspaper className="text-primary"/> {t('blogManagementCardTitle')}</CardTitle>
            <CardDescription>{t('blogManagementCardDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/blog" passHref>
              <Button variant="outline" className="mt-2 w-full">{t('manageBlogButton')}</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><ListChecks className="text-primary"/> {t('travelPlansCardTitle')}</CardTitle>
            <CardDescription>{t('travelPlansCardDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground">
              ({t('comingSoonParenthesis')} - {t('travelPlansCardDesc')})
            </p>
            {/* <Link href="/admin/travel-plans" passHref><Button variant="outline" className="mt-2 w-full">Manage Travel Plans</Button></Link> */}
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Settings className="text-primary"/> {t('appSettingsCardTitle')}</CardTitle>
            <CardDescription>{t('appSettingsCardDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/app-settings" passHref>
              <Button variant="outline" className="mt-2 w-full">{t('configureSettingsButton')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
