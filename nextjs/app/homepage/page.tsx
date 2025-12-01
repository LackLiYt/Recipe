'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Music,
  Youtube,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  User
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// --- Link Validation Logic ---
const YOUTUBE_REGEX =
  /^(https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/).*$/i;

const isValidYouTubeUrl = (url: string): boolean => {
  if (!url || url.length < 5) return false;
  return YOUTUBE_REGEX.test(url.trim());
};

interface ComparisonResult {
  matched_title: string;
  matched_url: string;
  similarity: number;
  uploaded_bpm?: number;
  uploaded_key?: string;
}

export default function MusicSearchHomePage() {
  const [linkInput, setLinkInput] = useState('');
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    name?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  // Get user from Supabase
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser }, error }) => {
      if (error || !authUser) {
        router.push('/login');
        return;
      }
      setUser({
        id: authUser.id,
        email: authUser.email,
        name:
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0] ||
          'User'
      });
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Please log in to continue');
      return;
    }

    const trimmedUrl = linkInput.trim();
    if (!trimmedUrl) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!isValidYouTubeUrl(trimmedUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL ||
        'http://localhost:8000';

      const response = await fetch(`${backendUrl}/music/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_uid: user.id,
          youtube_url: trimmedUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `Server error: ${response.status}`
        }));
        throw new Error(errorData.detail);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to process song.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Melodora</h1>
              <p className="text-xs text-muted-foreground">
                Intelligent music discovery
              </p>
            </div>
          </div>

          {user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg"
              >
                <User className="w-4 h-4" />
                <span>{user.name}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl bg-card border border-border shadow-lg py-1 text-sm">
                  <button
                    className="w-full px-3 py-2 text-left hover:bg-muted"
                    onClick={() => router.push('/profile')}
                  >
                    Profile
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left hover:bg-muted"
                    onClick={() => router.push('/history')}
                  >
                    History
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    className="w-full px-3 py-2 text-left text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <Search className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h2 className="text-4xl font-bold">Find Similar Songs</h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto space-y-6"
        >
          <div className="relative">
            <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="url"
              placeholder="Paste YouTube URL here..."
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              disabled={loading}
              className="w-full pl-12 pr-4 py-4 border-2 border-border rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValidYouTubeUrl(linkInput)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Processing…
              </>
            ) : (
              <>
                <Search /> Find Similar Song
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 max-w-2xl mx-auto p-4 bg-destructive/10 rounded-xl flex gap-3">
            <AlertTriangle className="text-destructive" />
            {error}
          </div>
        )}

        {!loading && result && (
          <div className="max-w-3xl mx-auto mt-12 border-2 border-border rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500" />
                <h3 className="text-2xl font-bold">
                  {result.matched_title}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Similarity</p>
                <p className="text-3xl font-bold text-primary">
                  {(result.similarity * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <a
              href={result.matched_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg"
            >
              <ExternalLink className="w-4 h-4" />
              Open on YouTube
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
