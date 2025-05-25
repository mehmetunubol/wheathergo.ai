
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ListChecks, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Added Button import

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to the Weatherugo Admin Panel. Manage users, travel plans, and application settings from here.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Users className="text-primary"/> User Management</CardTitle>
            <CardDescription>View and manage user accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/users" passHref>
              <Button variant="outline" className="mt-2 w-full">Manage Users</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><ListChecks className="text-primary"/> Travel Plans</CardTitle>
            <CardDescription>Oversee all user travel plans.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground">
              (Coming soon)
            </p>
            {/* <Link href="/admin/travel-plans" passHref><Button variant="outline" className="mt-2 w-full">Manage Travel Plans</Button></Link> */}
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Settings className="text-primary"/> Application Settings</CardTitle>
            <CardDescription>Configure global application parameters.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              (Coming soon)
            </p>
            {/* <Link href="/admin/app-settings" passHref><Button variant="outline" className="mt-2 w-full">Configure Settings</Button></Link> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
