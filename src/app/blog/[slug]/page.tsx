
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import type { BlogPost } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CalendarDays, User, Edit3 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";

// For now, we'll treat content as HTML and use dangerouslySetInnerHTML.
// In a real app, sanitize this HTML or use a Markdown parser.

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { dateLocale } = useLanguage();
  const { t } = useTranslation();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    if (!slug) {
      setIsLoading(false);
      setError(t('slugMissingError'));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const postsCollectionRef = collection(db, "blogPosts");
      const q = query(
        postsCollectionRef,
        where("slug", "==", slug),
        where("isPublished", "==", true),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setPost(null);
        setError(t('blogPostNotFound')); // Or trigger Next.js notFound()
      } else {
        const docSnap = querySnapshot.docs[0];
        setPost({ id: docSnap.id, ...docSnap.data() } as BlogPost);
      }
    } catch (err) {
      console.error("Error fetching blog post by slug:", err);
      setError(t('errorFetchingBlogPost'));
    } finally {
      setIsLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !post) {
    // For a real 404, you might call notFound() from next/navigation
    // if running this logic in a server component or getStaticProps/getServerSideProps
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">{t('error')}</h1>
        <p className="text-muted-foreground">{error || t('blogPostNotFound')}</p>
        <Link href="/blog" passHref>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToBlog')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <header>
        <Button variant="outline" size="sm" asChild className="mb-6">
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToBlog')}
          </Link>
        </Button>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          {post.title}
        </h1>
        <div className="mt-3 text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 items-center">
          <span className="flex items-center gap-1.5">
            <User size={14} /> {post.authorName || 'Weatherugo Team'}
          </span>
          {post.publishedAt && (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} /> {format(parseISO(post.publishedAt), "MMMM d, yyyy", { locale: dateLocale })}
            </span>
          )}
           {post.authorId && post.id && ( // Check if user is an admin and this is their post - simplistic
             <Link href={`/admin/blog/edit/${post.id}`} passHref>
               <Button variant="ghost" size="sm" className="text-xs p-1 h-auto">
                 <Edit3 size={12} className="mr-1"/> {t('editPost')}
               </Button>
             </Link>
           )}
        </div>
      </header>

      {post.imageUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-lg shadow-md">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover"
            data-ai-hint={`blog post ${post.tags ? post.tags.join(' ') : 'general'} detail`}
          />
        </div>
      )}

      <div
        className="prose prose-lg dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }} // SANITIZE THIS IN A REAL APP
      />

      {post.tags && post.tags.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">{t('tags')}:</h3>
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

