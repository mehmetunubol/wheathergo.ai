
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import type { BlogPost } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Send, Brain } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/hooks/use-translation";
import { generateBlogContent } from "@/ai/flows/generate-blog-content-flow";
import { useLanguage } from "@/contexts/language-context";
import dynamic from 'next/dynamic';

const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

// Basic slugify function
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-"); // Replace multiple - with single -
}

export default function CreateBlogPostPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [promptDetails, setPromptDetails] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState(""); // Comma-separated
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (title) {
      setSlug(slugify(title));
    } else {
      setSlug("");
    }
  }, [title]);

  const handleGenerateWithAI = async () => {
    if (!title.trim()) {
      toast({ title: t('error'), description: t('blogAIGenTitleRequired'), variant: "destructive" });
      return;
    }
    setIsGeneratingAI(true);
    try {
      const result = await generateBlogContent({ 
        title: title.trim(), 
        promptDetails: promptDetails.trim() || undefined,
        language: language 
      });
      if (result && result.generatedContent) {
        setContent(result.generatedContent);
        toast({ title: t('aiGeneratedContentTitle'), description: t('aiGeneratedContentDesc') });
      } else {
        throw new Error("AI did not return content.");
      }
    } catch (err) {
      console.error("Error generating blog content with AI:", err);
      toast({ title: t('error'), description: (err as Error).message || "Failed to generate content with AI.", variant: "destructive" });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (publishAction: boolean) => {
    if (!title || !content) {
      toast({ title: t('error'), description: t('blogTitleContentRequired'), variant: "destructive" });
      return;
    }
    if (!user || !isAdmin) {
      toast({ title: t('error'), description: t('actionDenied'), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    const newPost: BlogPost = {
      title: title.trim(),
      slug: slug.trim() || slugify(title.trim()),
      content: content.trim(),
      authorId: user.uid,
      authorName: user.displayName || user.email,
      createdAt: now,
      updatedAt: now,
      isPublished: publishAction,
      publishedAt: publishAction ? now : null,
      excerpt: excerpt.trim() || content.substring(0, 150) + (content.length > 150 ? "..." : ""),
      imageUrl: imageUrl.trim() || undefined,
      tags: tags.split(",").map(tag => tag.trim()).filter(tag => tag),
    };

    try {
      await addDoc(collection(db, "blogPosts"), newPost);
      toast({ title: t('success'), description: t('blogPostCreatedSuccess') });
      router.push("/admin/blog");
    } catch (err) {
      console.error("Error creating blog post:", err);
      toast({ title: t('error'), description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/blog" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t('createNewBlogPostTitle')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('blogPostDetailsTitle')}</CardTitle>
          <CardDescription>{t('blogPostDetailsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">{t('title')}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('blogTitlePlaceholder')} />
          </div>
          <div>
            <Label htmlFor="slug">{t('slug')}</Label>
            <Input id="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder={t('blogSlugPlaceholder')} />
            <p className="text-xs text-muted-foreground mt-1">{t('blogSlugDesc')}</p>
          </div>
          <div>
            <Label htmlFor="promptDetails">{t('blogPromptDetailsLabel')}</Label>
            <Textarea 
              id="promptDetails" 
              value={promptDetails} 
              onChange={(e) => setPromptDetails(e.target.value)} 
              placeholder={t('blogPromptDetailsPlaceholder')}
              className="min-h-[100px]" 
            />
          </div>
          <div>
            <Label htmlFor="content">{t('content')}</Label>
            <div className="mt-1" data-color-mode="light">
              <MDEditor
                value={content}
                onChange={(val) => setContent(val || "")}
                height={400}
                preview="live"
              />
            </div>
            <Button onClick={handleGenerateWithAI} variant="outline" size="sm" className="mt-2" disabled={isGeneratingAI || !title.trim()}>
              <Brain className="mr-2 h-4 w-4" /> {isGeneratingAI ? t('generatingButton') : t('generateWithAIButton')}
            </Button>
          </div>
          <div>
            <Label htmlFor="excerpt">{t('excerptOptional')}</Label>
            <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder={t('blogExcerptPlaceholder')} className="min-h-[80px]" />
          </div>
          <div>
            <Label htmlFor="imageUrl">{t('imageUrlOptional')}</Label>
            <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://placehold.co/600x400.png" data-ai-hint="blog header" />
          </div>
          <div>
            <Label htmlFor="tags">{t('tagsOptional')}</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('blogTagsPlaceholder')} />
            <p className="text-xs text-muted-foreground mt-1">{t('blogTagsDesc')}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="isPublished" checked={isPublished} onCheckedChange={setIsPublished} />
            <Label htmlFor="isPublished">{t('publishImmediately')}</Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" /> {t('saveDraftButton')}
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={isSaving}>
            <Send className="mr-2 h-4 w-4" /> {t('publishButton')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
