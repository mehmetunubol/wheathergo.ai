
"use client";

import React from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import type { User } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ShieldCheck, ShieldOff, UserCheck, UserX, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";

export default function AdminUsersPage() {
  const { user: adminUser, isAdmin: isAdminAuth } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { dateLocale } = useLanguage();
  const { t } = useTranslation();

  const fetchUsers = React.useCallback(async () => {
    if (!isAdminAuth) {
      setError(t('actionDenied'));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as User);
      });
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      const errorMessage = (err as Error).message || t('error');
      setError(t('errorFetchingUsers') + ": " + errorMessage);
      toast({
        title: t('errorFetchingUsers'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAdminAuth, toast, t]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (userId === adminUser?.uid) {
      toast({ title: t('actionDenied'), description: t('actionDenied'), variant: "destructive" });
      return;
    }
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isAdmin: !currentIsAdmin });
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.uid === userId ? { ...u, isAdmin: !currentIsAdmin } : u
        )
      );
      toast({ title: t('adminStatusUpdated'), description: `User ${userId} ${t('adminStatusUpdated').toLowerCase()} ${!currentIsAdmin}.` });
    } catch (err) {
      console.error("Error updating admin status:", err);
      toast({ title: t('updateFailed'), description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (userId: string, currentIsActive: boolean) => {
     if (userId === adminUser?.uid) {
      toast({ title: t('actionDenied'), description: t('actionDenied'), variant: "destructive" });
      return;
    }
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { isActive: !currentIsActive });
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.uid === userId ? { ...u, isActive: !currentIsActive } : u
        )
      );
      toast({ title: t('userStatusUpdated'), description: `User ${userId} ${t('userStatusUpdated').toLowerCase()} ${!currentIsActive}.` });
    } catch (err) {
      console.error("Error updating active status:", err);
      toast({ title: t('updateFailed'), description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === adminUser?.uid) {
      toast({ title: t('actionDenied'), description: t('actionDenied'), variant: "destructive" });
      return;
    }
    try {
      const userDocRef = doc(db, "users", userId);
      await deleteDoc(userDocRef);
      setUsers((prevUsers) => prevUsers.filter((u) => u.uid !== userId));
      toast({ title: t('userDeleted'), description: `User ${userId} Firestore record has been deleted.` });
    } catch (err) {
      console.error("Error deleting user:", err);
      toast({ title: t('deleteFailed'), description: (err as Error).message, variant: "destructive" });
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      // Ensure dateLocale is defined before using it, fallback to undefined if not
      return format(parseISO(dateString), 'PPpp', { locale: dateLocale || undefined });
    } catch {
      return dateString; 
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('userManagementTitle')}</h1>
        <div className="border rounded-lg p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t('userManagementTitle')}</h1>
        <div className="text-red-600 bg-red-100 border border-red-300 p-4 rounded-md flex items-center gap-2">
          <ShieldAlert className="h-5 w-5"/> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('userManagementTitle')}</h1>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">{t('userIdTableHeader')}</TableHead>
              <TableHead>{t('emailTableHeader')}</TableHead>
              <TableHead>{t('displayNameTableHeader')}</TableHead>
              <TableHead>{t('createdAtTableHeader')}</TableHead>
              <TableHead className="text-center">{t('isAdminTableHeader')}</TableHead>
              <TableHead className="text-center">{t('isActiveTableHeader')}</TableHead>
              <TableHead className="text-right">{t('actionsTableHeader')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {t('noUsersFound')}
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell className="font-medium text-xs truncate" title={user.uid}>{user.uid}</TableCell>
                <TableCell>{user.email || "N/A"}</TableCell>
                <TableCell>{user.displayName || "N/A"}</TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={!!user.isAdmin}
                    onCheckedChange={() => handleToggleAdmin(user.uid, !!user.isAdmin)}
                    disabled={user.uid === adminUser?.uid}
                    aria-label={user.isAdmin ? t('demoteAdminAria') : t('promoteAdminAria')}
                  />
                  {user.isAdmin ? <ShieldCheck className="inline-block ml-1 h-4 w-4 text-green-600" /> : <ShieldOff className="inline-block ml-1 h-4 w-4 text-muted-foreground" />}
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={!!user.isActive}
                    onCheckedChange={() => handleToggleActive(user.uid, !!user.isActive)}
                    disabled={user.uid === adminUser?.uid}
                    aria-label={user.isActive ? t('deactivateUserAria') : t('activateUserAria')}
                  />
                   {user.isActive ? <UserCheck className="inline-block ml-1 h-4 w-4 text-green-600" /> : <UserX className="inline-block ml-1 h-4 w-4 text-red-600" />}
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={user.uid === adminUser?.uid}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteUserDialogTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('deleteUserDialogDesc')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteUser(user.uid)}>
                          {t('deleteRecordButton')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
