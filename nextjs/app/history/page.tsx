'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Music, TrendingUp, ExternalLink, Loader2, User, Search } from 'lucide-react';

interface HistoryItem {
  id: string;
  uploaded_url: string;
  from_title: string;
  matched_title: string;
  matched_url: string;
  similarity: number;
  created_at: string;
}

export default function HistoryPage() {
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser }, error }) => {
      if (error || !authUser) {
        router.push('/login');
        return;
      }
      setUser({
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      });
      await loadHistory(authUser.id);
    });
  }, [router]);

  const loadHistory = async (userId: string) => {
    setLoadingHistory(true);
    try {
      const supabase = createClient();

      const { data: comparisonsData, error: comparisonsError } = await supabase
        .from('comparisons')
        .select('id, uploaded_url, from_title, matched_title, matched_url, similarity, created_at')
        .eq('user_uid', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (comparisonsError || !comparisonsData) {
        setHistory([]);
        return;
      }

      const items: HistoryItem[] = comparisonsData.map((item: any) => ({
        id: item.id,
        uploaded_url: item.uploaded_url,
        from_title: item.from_title || 'Unknown Title',
        matched_title: item.matched_title || 'Unknown Song',
        matched_url: item.matched_url,
        similarity: item.similarity,
        created_at: item.created_at,
      }));

      setHistory(items);
    } catch (err) {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Melodora</h1>
                <p className="text-xs text-muted-foreground">Your search history</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/homepage')}
                className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition"
              >
                <Search className="w-4 h-4" />
                <span>Back to search</span>
              </button>
              {user && (
                <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">History</h2>
              <p className="text-sm text-muted-foreground">
                All your recent song comparisons
              </p>
            </div>
            {history.length > 0 && (
              <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>{history.length} comparisons</span>
              </div>
            )}
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg mb-2">
                No search history yet
              </p>
              <p className="text-sm text-muted-foreground">
                Start comparing songs from the homepage to see them listed here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-6 bg-muted hover:bg-muted/80 rounded-xl border-2 border-border transition group"
                >
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Uploaded title
                      </p>
                      <p className="font-semibold text-lg">
                        {item.from_title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Matched title
                      </p>
                      <p className="font-semibold text-lg">
                        {item.matched_title}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Similarity
                      </p>
                      <p className="font-bold text-lg">
                        {(item.similarity * 100).toFixed(1)}%
                      </p>
                    </div>
                    <a
                      href={item.matched_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Go to YouTube</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


