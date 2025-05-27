
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, updateDoc, setDoc } from "firebase/firestore"; // Added setDoc
import type { BlogPost, UserBlogPostReaction } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CalendarDays, User, Edit3, ThumbsUp } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { useLanguage } from "@/contexts/language-context";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { dateLocale } = useLanguage();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentLikeCount, setCurrentLikeCount] = useState(0);
  const [userReaction, setUserReaction] = useState<UserBlogPostReaction | null>(null);
  const [reactionLoading, setReactionLoading] = useState(false);

  const fetchPostAndReaction = useCallback(async () => {
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
        setError(t('blogPostNotFound'));
      } else {
        const docSnap = querySnapshot.docs[0];
        const postData = { id: docSnap.id, ...docSnap.data() } as BlogPost;
        setPost(postData);
        setCurrentLikeCount(postData.likeCount || 0);

        if (isAuthenticated && user && postData.id) {
          const reactionRef = doc(db, "userBlogReactions", user.uid, "likedPosts", postData.id);
          const reactionSnap = await getDoc(reactionRef);
          if (reactionSnap.exists()) {
            setUserReaction(reactionSnap.data() as UserBlogPostReaction);
          } else {
            setUserReaction(null);
          }
        } else {
          setUserReaction(null);
        }
      }
    } catch (err) {
      console.error("Error fetching blog post by slug:", err);
      setError(t('errorFetchingBlogPost'));
    } finally {
      setIsLoading(false);
    }
  }, [slug, t, isAuthenticated, user]);

  useEffect(() => {
    fetchPostAndReaction();
  }, [fetchPostAndReaction]);

  const handleLikePost = async () => {
    if (!isAuthenticated || !user || !post || !post.id) {
      toast({ title: t('loginRequired'), description: t('loginToLikePosts'), variant: "destructive" });
      return;
    }
    setReactionLoading(true);
    const postRef = doc(db, "blogPosts", post.id);
    const reactionRef = doc(db, "userBlogReactions", user.uid, "likedPosts", post.id);

    try {
      if (userReaction) { // User is unliking
        await updateDoc(postRef, { likeCount: Math.max(0, (post.likeCount || 0) - 1) });
        await deleteDoc(reactionRef);
        setUserReaction(null);
        setCurrentLikeCount(prev => Math.max(0, prev - 1));
        toast({ title: t('success'), description: t('reactionSaved') });
      } else { // User is liking
        await updateDoc(postRef, { likeCount: (post.likeCount || 0) + 1 });
        await setDoc(reactionRef, { postId: post.id, userId: user.uid, type: 'like', reactedAt: new Date().toISOString() });
        setUserReaction({ postId: post.id, userId: user.uid, type: 'like', reactedAt: new Date().toISOString() });
        setCurrentLikeCount(prev => prev + 1);
        toast({ title: t('success'), description: t('reactionSaved') });
      }
    } catch (err) {
      console.error("Error handling like:", err);
      toast({ title: t('error'), description: t('reactionError'), variant: "destructive" });
      // Revert optimistic updates on error if needed, or refetch
      fetchPostAndReaction(); 
    } finally {
      setReactionLoading(false);
    }
  };


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
           {isAuthenticated && user?.uid === post.authorId && ( 
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

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>

      <div className="mt-6 flex items-center space-x-4">
        <Button 
          onClick={handleLikePost} 
          variant={userReaction ? "secondary" : "outline"} 
          size="sm" 
          disabled={reactionLoading || !isAuthenticated}
          aria-pressed={!!userReaction}
        >
          <ThumbsUp className={`mr-2 h-4 w-4 ${userReaction ? "text-primary" : ""}`} />
          {userReaction ? t('likedButton') : t('likeButton')} ({currentLikeCount})
        </Button>
        {/* Placeholder for comments button */}
        {/* <Button variant="outline" size="sm" disabled> <MessageCircle className="mr-2 h-4 w-4" /> {t('commentsButton')} (0) </Button> */}
      </div>
      {!isAuthenticated && <p className="text-xs text-muted-foreground mt-2">{t('loginToLikePostsShort')}</p>}


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
