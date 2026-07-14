import React, { useState, useEffect } from "react";
import { BookOpen, Calendar, User, ArrowRight, Flame, Award, Shield, Loader2, X } from "lucide-react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import Markdown from "react-markdown";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  readTime: string;
  featured?: boolean;
  content: string;
  createdAt?: string;
  bannerImage?: string;
}

const STATIC_BLOG_POSTS: BlogPost[] = [
  {
    id: "1",
    title: "How to Choose a Trusted Casino Broker in 2026",
    excerpt: "Navigating the online casino market can be complex. Learn how professional casino brokers evaluate security, licensing, payout speed, and cashback terms to protect your funds.",
    category: "Brokerage Guides",
    date: "July 2, 2026",
    author: "Eker Editorial",
    readTime: "5 min read",
    featured: true,
    content: "When it comes to high-stakes gaming, trust is everything. A professional casino broker acts as an intermediary, vetting platforms for licensing, game fairness, and prompt payout processing. This guide explores the critical checklist: checking Malta/Curacao registrations, verifying direct payout pipelines, understanding affiliate incentive structures, and ensuring your data remains encrypted and safe from bad actors."
  },
  {
    id: "2",
    title: "Understanding Casino Cashback & Campaign Bonuses",
    excerpt: "Maximize your returns. Learn the difference between match bonuses, reload rewards, and lifetime wagering cashbacks, and how to spot wagering requirement traps.",
    category: "Bonuses & Promos",
    date: "June 28, 2026",
    author: "Anik Hoque",
    readTime: "4 min read",
    content: "Not all bonuses are created equal. Many online platforms advertise massive match bonuses but hide strict 40x or 50x wagering requirements in the fine print. Standard brokers recommend looking for direct cashback programs (like 5-10% weekly wager cashback) or low-wagering reload deals that allow you to withdraw your earnings without complex playthrough obstacles."
  },
  {
    id: "3",
    title: "Inside the Vetting Process: How We Audit Jackpot Submissions",
    excerpt: "Transparency is our foundation. A detailed breakdown of how our vetting desk validates screenshot proof, bet slips, and transaction logs before listing campaigns.",
    category: "Transparency",
    date: "June 15, 2026",
    author: "Security Desk",
    readTime: "6 min read",
    content: "Every jackpot and Campaign proof listed on Eker Listings undergoes manual auditing. Our verification specialists examine high-resolution screenshot metadata, cross-reference transaction IDs on the blockchain or game logs, and contact casino operators directly. This painstaking vetting ensures our visitors only play verified winning campaigns."
  }
];

export default function BlogView() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  // Custom styling elements to render rich markdown in our blog cards & detail views
  const markdownComponents = {
    h1: (props: any) => <h1 className="text-lg font-black text-slate-900 mt-5 mb-2 border-b border-slate-100 pb-1" {...props} />,
    h2: (props: any) => <h2 className="text-md font-extrabold text-slate-900 mt-4 mb-2" {...props} />,
    h3: (props: any) => <h3 className="text-xs font-bold text-slate-800 mt-3 mb-1 uppercase tracking-wider" {...props} />,
    p: (props: any) => <p className="text-xs text-slate-600 leading-relaxed mb-3.5 font-medium" {...props} />,
    ul: (props: any) => <ul className="list-disc pl-5 mb-4 text-xs text-slate-600 space-y-1" {...props} />,
    ol: (props: any) => <ol className="list-decimal pl-5 mb-4 text-xs text-slate-600 space-y-1" {...props} />,
    li: (props: any) => <li className="text-xs text-slate-600 font-medium" {...props} />,
    strong: (props: any) => <strong className="font-extrabold text-slate-900" {...props} />,
    a: (props: any) => (
      <a 
        className="text-indigo-600 hover:text-indigo-800 font-extrabold underline transition-all bg-indigo-50/50 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5" 
        target="_blank" 
        rel="noopener noreferrer" 
        referrerPolicy="no-referrer"
        {...props}
      />
    ),
    blockquote: (props: any) => (
      <blockquote className="border-l-4 border-indigo-500 bg-slate-50/80 p-3 rounded-r-xl my-4 text-xs text-slate-600 italic font-medium leading-relaxed" {...props} />
    )
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "blogs"),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as BlogPost[];

        if (list.length > 0) {
          // Sort by creation time or date
          list.sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
          });
          setPosts(list);
        } else {
          setPosts(STATIC_BLOG_POSTS);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Error loading blogs from Firestore, falling back:", err);
        setPosts(STATIC_BLOG_POSTS);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading dynamic insights...</span>
      </div>
    );
  }

  const featuredPost = posts.find(p => p.featured) || posts[0];
  const regularPosts = posts.filter(p => p.id !== featuredPost?.id);

  return (
    <div id="blog-view" className="space-y-12 max-w-5xl mx-auto py-4">
      {/* Blog Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs">
          <BookOpen className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-sans font-black tracking-tight text-slate-900 sm:text-4xl">
          Eker Listings Chronicle
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          Expert insights, regulatory updates, betting tutorials, and comprehensive breakdowns of premium casino brokers worldwide.
        </p>
      </div>

      {/* Featured Post */}
      {featuredPost && (
        <div 
          onClick={() => setSelectedPost(featuredPost)}
          className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 grid grid-cols-1 md:grid-cols-12 gap-6 p-6 cursor-pointer"
        >
          <div className="md:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-rose-50 text-rose-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
                  Featured Article
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-bold">{featuredPost.category}</span>
              </div>
              
              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight tracking-tight hover:text-indigo-600 transition-colors">
                {featuredPost.title}
              </h2>
              
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                {featuredPost.excerpt}
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-slate-650 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 line-clamp-3 overflow-hidden font-medium">
                {featuredPost.content.replace(/[#*`[\]]/g, '')}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-300" />
                    {featuredPost.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                    {featuredPost.date}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-indigo-600 font-bold">{featuredPost.readTime}</span>
                  <span className="text-indigo-600 font-bold text-[11px] hover:translate-x-0.5 transition-transform">&rarr;</span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 bg-gradient-to-br from-indigo-500 to-indigo-850 rounded-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden shadow-inner min-h-[220px]">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 h-40 w-40 rounded-full bg-white/5" />
            
            {featuredPost.bannerImage ? (
              <img 
                src={featuredPost.bannerImage} 
                alt="Banner" 
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 pointer-events-none" 
                referrerPolicy="no-referrer"
              />
            ) : null}

            <div className="space-y-2 relative z-10">
              <Award className="w-8 h-8 text-indigo-200" />
              <h3 className="font-black text-lg leading-tight">Secured Brokerage Standard</h3>
              <p className="text-[11px] text-indigo-100 leading-normal">
                Eker Listings enforces a strict triple-vetting mechanism across all featured deals. Only fully licensed and audited operators make the platform.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200 hover:text-white transition-colors cursor-pointer pt-4 border-t border-indigo-400/20 relative z-10">
              <span>Read Full Editorial</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Grid Articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {regularPosts.map((post) => (
          <div 
            key={post.id} 
            onClick={() => setSelectedPost(post)}
            className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md">
                  {post.category}
                </span>
                <span className="text-[10px] text-slate-400 font-bold font-mono">{post.readTime}</span>
              </div>
              <h3 className="font-black text-slate-950 text-sm hover:text-indigo-600 transition-colors leading-snug">
                {post.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                {post.excerpt}
              </p>
              
              {post.bannerImage && (
                <div className="h-28 w-full rounded-xl overflow-hidden border border-slate-100 mb-2">
                  <img 
                    src={post.bannerImage} 
                    alt={post.title} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.parentElement?.remove();
                    }}
                  />
                </div>
              )}

              <div className="text-xs text-slate-650 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 line-clamp-3 overflow-hidden font-medium">
                {post.content.replace(/[#*`[\]]/g, '')}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-300" />
                  {post.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-300" />
                  {post.date}
                </span>
              </div>
              <span className="text-indigo-600 hover:underline flex items-center gap-0.5">
                Read &rarr;
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Trust Banner footer */}
      <div className="bg-linear-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs">Responsible Gaming Advocate</h4>
            <p className="text-[11px] text-slate-400 max-w-md">
              Eker Brokerage partners exclusively with operators that offer self-exclusion options, wager limiting, and strict KYC protocols.
            </p>
          </div>
        </div>
        <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="shrink-0 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold transition">
          BeGambleAware &rarr;
        </a>
      </div>

      {/* Blog Article Reader Modal Overlay */}
      {selectedPost && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] space-y-6 text-left relative">
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4 pr-8">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg">
                  {selectedPost.category}
                </span>
                <span className="text-[10px] font-bold font-mono text-slate-400">{selectedPost.readTime}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                {selectedPost.title}
              </h2>

              <div className="flex items-center gap-4 text-[11px] text-slate-400 font-semibold border-b border-slate-100 pb-4">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-300" />
                  {selectedPost.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-300" />
                  {selectedPost.date}
                </span>
              </div>
            </div>

            {selectedPost.bannerImage && (
              <div className="rounded-2xl overflow-hidden border border-slate-100 max-h-[280px]">
                <img
                  src={selectedPost.bannerImage}
                  alt={selectedPost.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.parentElement?.remove();
                  }}
                />
              </div>
            )}

            <div className="markdown-body prose prose-slate max-w-none text-xs leading-relaxed text-slate-600 space-y-4">
              <Markdown components={markdownComponents}>{selectedPost.content}</Markdown>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
