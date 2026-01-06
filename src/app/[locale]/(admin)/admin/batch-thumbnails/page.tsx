'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, ImageIcon, CheckCircle2 } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';

interface PostToProcess {
  id: string;
  imageUrl: string;
  seoSlug?: string;
}

interface ProcessResult {
  id: string;
  seoSlug?: string;
  thumbnailUrl?: string;
  success: boolean;
  error?: string;
}

export default function BatchThumbnailsPage() {
  const [posts, setPosts] = useState<PostToProcess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [results, setResults] = useState<ProcessResult[]>([]);

  // 1. Fetch posts that need thumbnails
  const handleFetch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/gallery/batch-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 200 }),
      });

      if (!response.ok) throw new Error('Fetch failed');

      const { data } = await response.json() as { data: any };
      setPosts(data.posts);
      toast.success(`Found ${data.posts.length} posts without thumbnails`);
    } catch (error) {
      toast.error('Failed to fetch posts');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Process all posts (Client-side compression using browser-image-compression)
  const handleProcess = async () => {
    if (posts.length === 0) {
      toast.error('No posts to process');
      return;
    }

    setIsProcessing(true);
    setProcessed(0);
    setResults([]);

    // Import thumbnail generator dynamically (client-side only)
    const { generateAndUploadThumbnail } = await import('@/shared/lib/thumbnail-generator');

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];

      try {
        console.log(`[Batch] Processing ${i + 1}/${posts.length}: ${post.seoSlug || post.id}`);

        // Generate and upload thumbnail (client-side compression)
        const thumbnailUrl = await generateAndUploadThumbnail({
          imageUrl: post.imageUrl,
          seoSlug: post.seoSlug,
        });

        // Update database
        await fetch('/api/admin/gallery/batch-thumbnails', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id, thumbnailUrl }),
        });

        setResults((prev) => [...prev, {
          id: post.id,
          seoSlug: post.seoSlug,
          thumbnailUrl,
          success: true
        }]);
        console.log(`[Batch] ✅ Done: ${post.seoSlug} → ${thumbnailUrl}`);
      } catch (error: any) {
        console.error(`[Batch] ❌ Failed: ${post.seoSlug || post.id}`, error);
        setResults((prev) => [...prev, {
          id: post.id,
          seoSlug: post.seoSlug,
          success: false,
          error: error.message
        }]);
      }

      setProcessed(i + 1);
    }

    setIsProcessing(false);
    toast.success('Batch processing complete!');
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const progress = posts.length > 0 ? (processed / posts.length) * 100 : 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold">Batch Generate Thumbnails</h1>

      {/* Step 1: Fetch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
            Find Posts Without Thumbnails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleFetch} disabled={isLoading || isProcessing}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
            Scan Posts
          </Button>
          {posts.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Found <span className="font-bold text-foreground">{posts.length}</span> posts without thumbnails
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Process */}
      {posts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              Generate Thumbnails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleProcess} disabled={isProcessing} variant="default">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {isProcessing ? `Processing ${processed}/${posts.length}...` : 'Start Processing'}
            </Button>

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">
                  {processed}/{posts.length} completed ({Math.round(progress)}%)
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="text-sm space-y-1">
                <p className="text-green-600">✅ Success: {successCount}</p>
                {failCount > 0 && <p className="text-red-600">❌ Failed: {failCount}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2 text-xs">
              {results.map((r, index) => (
                <div key={r.id} className={`p-2 rounded ${r.success ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                  <div className="flex items-center gap-2">
                    <span>{r.success ? '✅' : '❌'}</span>
                    <span className="font-medium">{index + 1}. {r.seoSlug || r.id}</span>
                  </div>
                  {r.success && r.thumbnailUrl && (
                    <div className="mt-1 text-muted-foreground truncate">
                      → {r.thumbnailUrl.split('/').pop()}
                    </div>
                  )}
                  {r.error && <div className="mt-1 text-red-600">{r.error}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
