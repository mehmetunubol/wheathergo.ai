
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { BlogPost } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Send, Brain, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/hooks/use-translation";
import { generateBlogContent } from "@/ai/flows/generate-blog-content-flow";
import { useLanguage } from "@/contexts/language-context";
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm'; // Import remark-gfm

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

// Basic slugify function (same as in create page)
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;

  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const [post, setPost] = useState<Partial<BlogPost>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentSlug, setCurrentSlug] = useState("");
  const [currentContent, setCurrentContent] = useState("");
  const [currentPromptDetails, setCurrentPromptDetails] = useState("");
  const [currentExcerpt, setCurrentExcerpt] = useState("");
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [currentTags, setCurrentTags] = useState("");
  const [currentIsPublished, setCurrentIsPublished] = useState(false);


  const fetchPost = useCallback(async () => {
    if (!postId) return;
    setIsLoading(true);
    setError(null);
    try {
      const postDocRef = doc(db, "blogPosts", postId);
      const docSnap = await getDoc(postDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as BlogPost;
        setPost(data);
        setCurrentTitle(data.title);
        setCurrentSlug(data.slug);
        setCurrentContent(data.content);
        setCurrentExcerpt(data.excerpt || "");
        setCurrentImageUrl(data.imageUrl || "");
        setCurrentTags((data.tags || []).join(", "));
        setCurrentIsPublished(data.isPublished);
      } else {
        setError(t('blogPostNotFound'));
      }
    } catch (err: any) {
      console.error("Error fetching blog post:", err);
      setError(t('errorFetchingBlogPost') + ": " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [postId, t]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);
  
  useEffect(() => {
    if (currentTitle && post.slug !== slugify(currentTitle)) {
      setCurrentSlug(slugify(currentTitle));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTitle]);


  const handleGenerateWithAI = async () => {
     if (!currentTitle.trim()) {
      toast({ title: t('error'), description: t('blogAIGenTitleRequired'), variant: "destructive" });
      return;
    }
    setIsGeneratingAI(true);
    try {
      const result = await generateBlogContent({ 
        title: currentTitle.trim(),
        promptDetails: currentPromptDetails.trim() || undefined,
        language: language
      });
      if (result && result.generatedContent) {
        setCurrentContent(prevContent => prevContent ? prevContent + "\n\n---\n\n" + result.generatedContent : result.generatedContent);
        toast({ title: t('aiGeneratedContentTitle'), description: t('aiGeneratedContentDesc') });
      } else {
        throw new Error("AI did not return content.");
      }
    } catch (err) {
      console.error("Error generating blog content with AI:", err);
      toast({ title: t('error'), description: (err as Error).message || t('errorAIGenerateGeneric'), variant: "destructive" });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (publishAction: boolean) => {
    if (!currentTitle || !currentContent) {
      toast({ title: t('error'), description: t('blogTitleContentRequired'), variant: "destructive" });
      return;
    }
    if (!user || !isAdmin) {
      toast({ title: t('error'), description: t('actionDenied'), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    
    const updatedPostData: Partial<BlogPost> = {
      title: currentTitle.trim(),
      slug: currentSlug.trim() || slugify(currentTitle.trim()),
      content: currentContent.trim(),
      updatedAt: now,
      isPublished: publishAction,
      excerpt: currentExcerpt.trim() || currentContent.substring(0, 150) + (currentContent.length > 150 ? "..." : ""),
      imageUrl: currentImageUrl.trim() || undefined,
      tags: currentTags.split(",").map(tag => tag.trim()).filter(tag => tag),
    };

    if (publishAction && !post.isPublished) {
        updatedPostData.publishedAt = now;
    } else if (publishAction && post.isPublished && post.publishedAt) {
        updatedPostData.publishedAt = post.publishedAt;
    }
    else if (!publishAction && post.isPublished) {
        updatedPostData.publishedAt = null;
    }
     else if (!publishAction && !post.isPublished) {
        updatedPostData.publishedAt = null;
    }


    try {
      const postDocRef = doc(db, "blogPosts", postId);
      await updateDoc(postDocRef, updatedPostData);
      toast({ title: t('success'), description: t('blogPostUpdatedSuccess') });
      router.push("/admin/blog");
    } catch (err: any) {
      console.error("Error updating blog post:", err);
      toast({ title: t('error'), description: t('errorFirebase', { message: err.message }), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/2" />
        <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
        <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
        <CardFooter><Skeleton className="h-10 w-32 ml-auto" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/blog" passHref><Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
                <h1 className="text-2xl font-bold">{t('editBlogPostTitle')}</h1>
            </div>
            <Card className="border-destructive">
                <CardHeader className="text-destructive flex items-center gap-2"><AlertTriangle /> {t('error')}</CardHeader>
                <CardContent>{error}</CardContent>
            </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/blog" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t('editBlogPostTitle')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('blogPostDetailsTitle')}</CardTitle>
          <CardDescription>{t('blogPostDetailsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">{t('title')}</Label>
            <Input id="title" value={currentTitle} onChange={(e) => setCurrentTitle(e.target.value)} placeholder={t('blogTitlePlaceholder')} />
          </div>
          <div>
            <Label htmlFor="slug">{t('slug')}</Label>
            <Input id="slug" value={currentSlug} onChange={(e) => setCurrentSlug(slugify(e.target.value))} placeholder={t('blogSlugPlaceholder')} />
             <p className="text-xs text-muted-foreground mt-1">{t('blogSlugDesc')}</p>
          </div>
          <div>
            <Label htmlFor="promptDetails">{t('blogPromptDetailsLabel')}</Label>
            <Textarea 
              id="promptDetails" 
              value={currentPromptDetails} 
              onChange={(e) => setCurrentPromptDetails(e.target.value)} 
              placeholder={t('blogPromptDetailsPlaceholder')}
              className="min-h-[100px]" 
            />
          </div>
           <div className="mt-2">
             <Button onClick={handleGenerateWithAI} variant="outline" size="sm" disabled={isGeneratingAI || !currentTitle.trim()}>
              <Brain className="mr-2 h-4 w-4" /> {isGeneratingAI ? t('generatingButton') : t('generateWithAIButton')}
            </Button>
          </div>
          <div>
            <Label htmlFor="content">{t('content')}</Label>
            <div className="mt-1" data-color-mode="light">
              <MDEditor
                value={currentContent}
                onChange={(val) => setCurrentContent(val || "")}
                height={400}
                preview="live"
                previewOptions={{
                  remarkPlugins: [remarkGfm],
                }}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="excerpt">{t('excerptOptional')}</Label>
            <Textarea id="excerpt" value={currentExcerpt} onChange={(e) => setCurrentExcerpt(e.target.value)} placeholder={t('blogExcerptPlaceholder')} className="min-h-[80px]" />
          </div>
          <div>
            <Label htmlFor="imageUrl">{t('imageUrlOptional')}</Label>
            <Input id="imageUrl" value={currentImageUrl} onChange={(e) => setCurrentImageUrl(e.target.value)} placeholder="https://placehold.co/600x400.png" data-ai-hint="blog header edit"/>
          </div>
          <div>
            <Label htmlFor="tags">{t('tagsOptional')}</Label>
            <Input id="tags" value={currentTags} onChange={(e) => setCurrentTags(e.target.value)} placeholder={t('blogTagsPlaceholder')} />
             <p className="text-xs text-muted-foreground mt-1">{t('blogTagsDesc')}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="isPublished" checked={currentIsPublished} onCheckedChange={setCurrentIsPublished} />
            <Label htmlFor="isPublished">{currentIsPublished ? t('publishedStatus') : t('draftStatus')}</Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => handleSubmit(currentIsPublished)} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" /> {t('saveChangesButton')}
          </Button>
          <Button onClick={() => handleSubmit(!currentIsPublished)} disabled={isSaving}>
            <Send className="mr-2 h-4 w-4" /> {currentIsPublished ? t('unpublishButton') : t('publishButton')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

    