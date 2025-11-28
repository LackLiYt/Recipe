'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Music, Youtube, AlertTriangle, LogOut, Loader2, CheckCircle2, ExternalLink, Clock, TrendingUp, User, History } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// --- Link Validation Logic ---
const YOUTUBE_REGEX = /^(https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/).*$/i;

/**
 * Checks if a URL is a valid YouTube link.
 */
const isValidYouTubeUrl = (url: string): boolean => {
  if (!url || url.length < 5) return false;
  return YOUTUBE_REGEX.test(url.trim());
};

interface ComparisonResult {
  matched_song: string;
  matched_url: string;
  similarity: number;
  uploaded_bpm?: number;
  uploaded_key?: string;
}

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

export default function MusicSearchHomePage() {
  const [linkInput, setLinkInput] = useState('');
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<'search' | 'history'>('search');
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
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User'
      });
      // Load history after user is set
      loadHistory(authUser.id);
    });
  }, [router]);

  const loadHistory = async (userId: string) => {
    setLoadingHistory(true);
    try {
      const supabase = createClient();
      
      // Fetch comparisons with matched_song_id
      const { data: comparisonsData, error: comparisonsError } = await supabase
        .from('comparisons')
        .select('id, uploaded_url, matched_song_id, matched_url, similarity, uploaded_bpm, uploaded_key, created_at')
        .eq('user_uid', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (comparisonsError) {
        console.error('Error fetching comparisons:', comparisonsError);
        setHistory([]);
        return;
      }

      if (!comparisonsData || comparisonsData.length === 0) {
        setHistory([]);
        return;
      }

      // Extract unique song IDs
      const songIds = comparisonsData
        .map(item => item.matched_song_id)
        .filter((id): id is number => id != null);

      // Fetch song titles if we have song IDs
      let songsMap = new Map<number, string>();
      if (songIds.length > 0) {
        const { data: songsData, error: songsError } = await supabase
          .from('songs')
          .select('id, title')
          .in('id', songIds);

        if (!songsError && songsData) {
          songsMap = new Map(songsData.map(song => [song.id, song.title]));
        }
      }

      // Map comparisons to history items with song titles
      const historyItems: HistoryItem[] = comparisonsData.map((item: any) => ({
        id: item.id,
        uploaded_url: item.uploaded_url,
        matched_song: songsMap.get(item.matched_song_id) || 'Unknown Song',
        matched_url: item.matched_url,
        similarity: item.similarity,
        uploaded_bpm: item.uploaded_bpm,
        uploaded_key: item.uploaded_key,
        created_at: item.created_at
      }));

      setHistory(historyItems);
    } catch (err) {
      console.error('Error loading history:', err);
      // Provide more detailed error information
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
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
      const backendUrl = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';
      
      const response = await fetch(`${backendUrl}/music/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_uid: user.id,
          youtube_url: trimmedUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `Server error: ${response.status} ${response.statusText}` }));
        throw new Error(errorData.detail || `Error: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      // Reload history after successful comparison
      if (user) {
        loadHistory(user.id);
      }
      // Switch to history tab to show the new result
      setActiveTab('history');
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to the server. Please make sure the Python backend is running on ' + (process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000'));
      } else {
        setError(err instanceof Error ? err.message : 'Failed to process song. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MusicSearch</h1>
                <p className="text-xs text-gray-500">AI-Powered Music Discovery</p>
              </div>
          </div>

          <div className="flex items-center space-x-4">
              {user && (
                <div className="hidden sm:flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
            </div>
              )}
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-gray-200 shadow-sm w-fit">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'search'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4" />
                <span>Search</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span>History</span>
              </div>
            </button>
          </div>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Find Similar Songs
          </h2>
                <p className="text-gray-600">
                  Paste a YouTube URL to discover similar music in our database
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mb-6">
                <div className="mb-4 relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Youtube className="w-5 h-5 text-gray-400" />
                  </div>
            <input
              type="url"
                    placeholder="Paste YouTube URL here..."
              value={linkInput}
                    onChange={(e) => {
                      setLinkInput(e.target.value);
                      setError(null);
                      setResult(null);
                    }}
                    disabled={loading}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base transition disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !isValidYouTubeUrl(linkInput.trim()) || !user}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Find Similar Song</span>
                    </>
                  )}
                </button>
              </form>

              {/* Result Display */}
              <div className="min-h-[120px]">
                {loading && (
                  <div className="flex flex-col items-center justify-center space-y-4 p-8">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-gray-600 font-medium">Processing your song... This may take a moment.</p>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}

                {result && (
                  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl space-y-4">
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle2 className="w-6 h-6" />
                      <h3 className="font-bold text-lg">Match Found!</h3>
                    </div>
                    <div className="space-y-3 text-left">
                      <div>
                        <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Matched Song</p>
                        <p className="font-semibold text-gray-900 text-lg">{result.matched_song}</p>
                      </div>
                      <a
                        href={result.matched_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition"
                      >
                        <span>Listen on YouTube</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <div className="pt-3 border-t border-green-200 flex items-center gap-6">
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Similarity</p>
                          <p className="text-lg font-bold text-gray-900">{(result.similarity * 100).toFixed(1)}%</p>
                        </div>
                        {result.uploaded_bpm && (
                          <div>
                            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">BPM</p>
                            <p className="text-lg font-bold text-gray-900">{result.uploaded_bpm}</p>
                          </div>
                        )}
                        {result.uploaded_key && (
                          <div>
                            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Key</p>
                            <p className="text-lg font-bold text-gray-900">{result.uploaded_key}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!loading && !error && !result && linkInput.trim() === '' && (
                  <div className="text-center p-8">
                    <p className="text-gray-500 text-lg">Enter a YouTube URL above to get started</p>
                  </div>
                )}

                {!loading && !error && !result && linkInput.trim() !== '' && !isValidYouTubeUrl(linkInput.trim()) && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-700 font-medium">
                      Please enter a valid YouTube URL (youtube.com/watch?v=... or youtu.be/...)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Search History</h2>
                  <p className="text-gray-600 text-sm">Your recent song comparisons</p>
                </div>
                {history.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <TrendingUp className="w-4 h-4" />
                    <span>{history.length} searches</span>
                  </div>
                )}
          </div>
          
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-2">No search history yet</p>
                  <p className="text-gray-400 text-sm">Start searching for similar songs to see your history here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Music className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition">
                                {item.matched_song}
                              </h3>
                              <p className="text-xs text-gray-500 truncate">{item.uploaded_url}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 ml-13">
                            <div className="flex items-center space-x-1 text-sm">
                              <TrendingUp className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold text-gray-900">{(item.similarity * 100).toFixed(1)}%</span>
                              <span className="text-gray-500">similar</span>
                            </div>
                            {item.uploaded_bpm && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">{item.uploaded_bpm}</span> BPM
                              </div>
                            )}
                            {item.uploaded_key && (
                              <div className="text-sm text-gray-600">
                                Key: <span className="font-medium">{item.uploaded_key}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(item.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <a
                          href={item.matched_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-4 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
        )}
      </main>
    </div>
  );
}
