"use client";

import { useState, useRef, useCallback } from "react";
import { Newspaper, ExternalLink, Calendar, Search, Loader2 } from "lucide-react";
import { newsApi, type Article } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/PageHeader";
import { useInfiniteQuery } from "@tanstack/react-query";

export default function NewsPage() {
  const [filter, setFilter] = useState("All");
  
  const { 
    data, 
    isLoading, 
    isError, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ["news"],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await newsApi.getNews(pageParam as number, 15);
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.has_more ? lastPage.page + 1 : undefined,
    staleTime: 10 * 60 * 1000,
  });
  
  const news = data?.pages.flatMap(p => p.items) || [];

  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );
  
  return (
    <PageShell>
      <PageHeader title="Agriculture News" subtitle="Latest farming trends, weather alerts, and market updates" icon="📰" />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
         {["All", "Weather", "Policy", "Research", "Market"].map(cat => (
            <button
               key={cat}
               onClick={() => setFilter(cat)}
               className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === cat ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-transparent text-gray-400 border border-gray-700 hover:border-gray-500'}`}
            >
               {cat}
            </button>
         ))}
      </div>

      <div className="space-y-4">
         {isLoading && (
           <div className="flex justify-center p-10"><Loader2 className="animate-spin text-green-500" size={32} /></div>
         )}
         {isError && (
           <div className="text-red-400 text-center p-10 bg-red-500/10 rounded-xl border border-red-500/20">Failed to load news. Please try again later.</div>
         )}
         {!isLoading && !isError && news.filter((n: Article) => filter === "All" || n.category === filter).length === 0 && (
           <div className="text-gray-400 text-center p-10">No news articles found for this category.</div>
         )}
         {news.filter((n: Article) => filter === "All" || n.category === filter).map((newsItem: Article, i: number) => (
            <a href={newsItem.link} target="_blank" rel="noreferrer" key={i} className="glass-card p-5 hover:border-green-500 transition-colors block">
               <div className="flex items-center gap-3 mb-3">
                  <span className="badge badge-info">{newsItem.category}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{newsItem.date}</span>
               </div>
               
               <h3 className="font-outfit font-bold text-lg mb-2">{newsItem.title}</h3>
               <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
                  {newsItem.excerpt}
               </p>
               
               <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                     <Newspaper size={14} /> {newsItem.source}
                  </div>
                  <button className="btn-ghost text-xs flex items-center gap-1">
                     Read Full <ExternalLink size={12} />
                  </button>
               </div>
            </a>
         ))}
         
         {/* Auto-loader boundary element */}
         <div ref={loadMoreRef} className="h-4" />

         {isFetchingNextPage && (
           <div className="flex justify-center pt-2 pb-10">
             <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 px-4 py-2 rounded-full">
               <Loader2 className="animate-spin" size={16} /> Loading more...
             </div>
           </div>
         )}
      </div>
    </PageShell>
  );
}
