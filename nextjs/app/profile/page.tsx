'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Music, LogOut, User, TrendingUp, Loader2, Search } from 'lucide-react';

interface HistoryItem {
  id: string;
  uploaded_url: string;
  matched_song: string;
  matched_url: string;
  similarity: number;
  uploaded_bpm?: number;
  uploaded_key?: string;
  created_at: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
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
        .select('id, uploaded_url, matched_song_id, matched_url, similarity, uploaded_bpm, uploaded_key, created_at')
        .eq('user_uid', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (comparisonsError) {
        console.error('Error fetching comparisons:', comparisonsError);
        setHistory([]);
        return;
      }

      if (!comparisonsData || comparisonsData.length === 0) {
        setHistory([]);
        return;
      }

      const songIds = comparisonsData
        .map((item) => item.matched_song_id)
        .filter((id): id is number => id != null);

      let songsMap = new Map<number, string>();
      if (songIds.length > 0) {
        const { data: songsData, error: songsError } = await supabase
          .from('songs')
          .select('id, title')
          .in('id', songIds);

        if (!songsError && songsData) {
          songsMap = new Map(songsData.map((song) => [song.id, song.title]));
        }
      }

      const items: HistoryItem[] = comparisonsData.map((item) => ({
        id: item.id,
        uploaded_url: item.uploaded_url,
        matched_song: songsMap.get(item.matched_song_id) || 'Unknown Song',
        matched_url: item.matched_url,
        similarity: item.similarity,
        uploaded_bpm: item.uploaded_bpm,
        uploaded_key: item.uploaded_key,
        created_at: item.created_at,
      }));

      setHistory(items);
    } catch (err) {
      console.error('Error loading history:', err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const totalSearches = history.length;
  const avgSimilarity =
    history.length > 0
      ? history.reduce((sum, item) => sum + item.similarity, 0) / history.length
      : 0;

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
                <p className="text-xs text-muted-foreground">Your account overview</p>
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
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-border bg-background/80 text-sm font-medium hover:bg-muted transition"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{user.name || 'Profile'}</span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-40 rounded-xl bg-card border border-border shadow-lg py-1 text-sm z-50">
                      <button
                        className="w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push('/profile');
                        }}
                      >
                        Profile
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          setMenuOpen(false);
                          router.push('/history');
                        }}
                      >
                        History
                      </button>
                      <div className="my-1 h-px bg-border" />
                      <button
                        className="w-full px-3 py-2 text-left text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          setMenuOpen(false);
                          await handleLogout();
                        }}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Profile Header */}
        <section className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <User className="w-8 h-8" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Profile
              </p>
              <h2 className="text-2xl font-bold">
                {user?.name || 'User'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto md:grid-cols-2">
            <div className="rounded-xl bg-muted border border-border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Total searches
              </p>
              <p className="text-2xl font-bold">
                {loadingHistory ? <span className="text-sm font-normal text-muted-foreground">Loading...</span> : totalSearches}
              </p>
            </div>
            <div className="rounded-xl bg-muted border border-border p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Average similarity
              </p>
              <p className="text-2xl font-bold">
                {loadingHistory
                  ? <span className="text-sm font-normal text-muted-foreground">Loading...</span>
                  : history.length > 0 ? `${(avgSimilarity * 100).toFixed(1)}%` : '--'}
              </p>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-8 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Recent activity
            </h3>
            {loadingHistory ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading your recent searches...</span>
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t compared any songs yet. Start from the search page to build your history.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You&apos;ve run <span className="font-semibold">{totalSearches}</span> searches so far.
                Your average match similarity is{' '}
                <span className="font-semibold">
                  {(avgSimilarity * 100).toFixed(1)}%
                </span>
                .
              </p>
            )}
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Quick links</h4>
            <button
              onClick={() => router.push('/homepage')}
              className="w-full inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
            >
              Go to search
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push('/history')}
              className="w-full inline-flex items-center justify-between px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition"
            >
              View full history
              <TrendingUp className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}


