
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, onSnapshot } from "firebase/firestore";
import type { BlogPost } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, User, ArrowRight, Newspaper } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { dateLocale } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    setIsLoading(true);
    const postsCollectionRef = collection(db, "blogPosts");
    const q = query(postsCollectionRef, where("isPublished", "==", true), orderBy("publishedAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedPosts: BlogPost[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPosts.push({ id: doc.id, ...doc.data() } as BlogPost);
      });
      setPosts(fetchedPosts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching published blog posts:", error);
      setIsLoading(false);
      // Optionally, set an error state here to display to the user
    });
    
    return () => unsubscribe();
  }, []);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), "MMMM d, yyyy", { locale: dateLocale });
    } catch {
      return dateString; // Fallback if parsing fails
    }
  };

  return (
    <div className="space-y-8 py-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight flex items-center justify-center gap-3">
          <Newspaper className="h-10 w-10 text-primary" /> Weatherugo {t('blogTitle')}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {t('blogDescription')}
        </p>
      </header>

      {isLoading && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex flex-col">
              <Skeleton className="h-48 w-full rounded-t-lg" />
              <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
              <CardContent className="flex-grow"><Skeleton className="h-12 w-full" /></CardContent>
              <CardFooter><Skeleton className="h-10 w-28" /></CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <div className="text-center py-12">
          <Newspaper size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">{t('noBlogPostsPublished')}</p>
        </div>
      )}

      {!isLoading && posts.length > 0 && (
        <div className="grid gap-8 md:grid-cols-2">
          {posts.map((post) => (
            <Card key={post.id} className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              {post.imageUrl && (
                <div className="h-48 w-full overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={`blog post ${post.tags ? post.tags.join(' ') : 'general'}`}
                  />
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-xl hover:text-primary transition-colors">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </CardTitle>
                <CardDescription className="!mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 items-center">
                  <span className="flex items-center gap-1"><User size={12} /> {post.authorName || 'Weatherugo Team'}</span>
                  <span className="flex items-center gap-1"><CalendarDays size={12} /> {formatDate(post.publishedAt)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {post.excerpt || post.content.substring(0, 150) + (post.content.length > 150 ? "..." : "")}
                </p>
              </CardContent>
              <CardFooter>
                <Link href={`/blog/${post.slug}`} passHref>
                  <Button variant="link" className="px-0 text-primary">
                    {t('readMore')} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
