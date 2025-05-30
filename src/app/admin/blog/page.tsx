
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import type { BlogPost } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, Eye, EyeOff, Newspaper } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";

export default function AdminBlogPostsPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { dateLocale } = useLanguage();

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setError(t('actionDenied'));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const postsCollectionRef = collection(db, "blogPosts");
    const q = query(postsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPosts: BlogPost[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPosts.push({ id: doc.id, ...doc.data() } as BlogPost);
      });
      setBlogPosts(fetchedPosts);
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching blog posts:", err);
      const errorMessage = (err as Error).message || t('error');
      setError(t('errorFetchingBlogPosts') + ": " + errorMessage);
      toast({ title: t('errorFetchingBlogPosts'), description: errorMessage, variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, toast, t]);

  const handleTogglePublish = async (postId: string, currentIsPublished: boolean, postTitle: string) => {
    try {
      const postDocRef = doc(db, "blogPosts", postId);
      await updateDoc(postDocRef, { 
        isPublished: !currentIsPublished,
        publishedAt: !currentIsPublished ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      });
      toast({ title: t('blogPostStatusUpdated'), description: t('blogPostStatusUpdatedParam', { postId: postTitle, status: !currentIsPublished ? t('publishedStatus') : t('unpublishedStatus') }) });
    } catch (err: any) {
      console.error("Error updating publish status:", err);
      toast({ title: t('updateFailed'), description: t('errorFirebase', { message: err.message }), variant: "destructive" });
    }
  };

  const handleDeletePost = async (postId: string, postTitle: string) => {
    try {
      const postDocRef = doc(db, "blogPosts", postId);
      await deleteDoc(postDocRef);
      toast({ title: t('blogPostDeleted'), description: t('blogPostDeletedParam', { postId: postTitle }) });
    } catch (err: any) {
      console.error("Error deleting blog post:", err);
      toast({ title: t('deleteFailed'), description: t('errorFirebase', { message: err.message }), variant: "destructive" });
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'PPpp', { locale: dateLocale || undefined });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Newspaper /> {t('blogManagementTitle')}</h1>
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-96 w-full border rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Newspaper /> {t('blogManagementTitle')}</h1>
        <div className="text-red-600 bg-red-100 border border-red-300 p-4 rounded-md">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Newspaper /> {t('blogManagementTitle')}</h1>
        <Link href="/admin/blog/create" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('createNewBlogPostButton')}
          </Button>
        </Link>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('title')}</TableHead>
              <TableHead>{t('author')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('createdAt')}</TableHead>
              <TableHead>{t('publishedAt')}</TableHead>
              <TableHead className="text-right">{t('actionsTableHeader')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blogPosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {t('noBlogPostsFound')}
                </TableCell>
              </TableRow>
            ) : (
              blogPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-xs truncate" title={post.title}>{post.title}</TableCell>
                  <TableCell>{post.authorName || 'N/A'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={post.isPublished}
                      onCheckedChange={() => handleTogglePublish(post.id!, post.isPublished, post.title)}
                      aria-label={post.isPublished ? t('unpublishBlogPost') : t('publishBlogPost')}
                    />
                    {post.isPublished ? <Eye className="inline-block ml-1 h-4 w-4 text-green-600" /> : <EyeOff className="inline-block ml-1 h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell>{formatDate(post.createdAt)}</TableCell>
                  <TableCell>{post.isPublished && post.publishedAt ? formatDate(post.publishedAt) : 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/admin/blog/edit/${post.id}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('confirmDeleteBlogPostTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('confirmDeleteBlogPostDesc', { postTitle: post.title })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePost(post.id!, post.title)}>
                            {t('deleteButton')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    