'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { CmsPostCards } from '@/lib/cms/types';

export default function PostCardsBlock({ block }: { block: CmsPostCards }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const cardsPerPage = 3;
  const totalPages = Math.ceil(block.posts.length / cardsPerPage);

  const scroll = (direction: 'prev' | 'next') => {
    const next = direction === 'next' ? Math.min(page + 1, totalPages - 1) : Math.max(page - 1, 0);
    setPage(next);
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.scrollWidth / block.posts.length;
      scrollRef.current.scrollTo({ left: next * cardsPerPage * cardWidth, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 lg:py-20 bg-primary/5">
      <div className="container-width">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">{block.title}</h2>
          {block.subtitle && (
            <p className="text-muted-foreground mt-2">{block.subtitle}</p>
          )}
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {block.posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-lg transition flex flex-col flex-shrink-0 snap-start"
                style={{ width: `calc((100% - ${(cardsPerPage - 1) * 24}px) / ${cardsPerPage})` }}
              >
                <div className="relative">
                  {post.cover ? (
                    <Image
                      src={post.cover.url}
                      alt={post.cover.alternativeText || post.title}
                      width={post.cover.width || 720}
                      height={post.cover.height || 360}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-video w-full bg-muted" />
                  )}
                  {post.category && (
                    <span className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1 rounded-full border border-border shadow-sm">
                      {post.category}
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  {(post.author || post.readTime) && (
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {post.author?.avatar ? (
                          <Image
                            src={post.author.avatar.url}
                            alt={post.author.name}
                            width={28}
                            height={28}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : post.author ? (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {post.author.name.charAt(0)}
                          </div>
                        ) : null}
                        {post.author && (
                          <span className="text-sm text-muted-foreground font-medium">{post.author.name}</span>
                        )}
                      </div>
                      {post.readTime && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" />
                            <path strokeLinecap="round" d="M12 6v6l4 2" />
                          </svg>
                          <span>{post.readTime} min</span>
                        </div>
                      )}
                    </div>
                  )}

                  <h3 className="font-bold text-lg leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                      {post.excerpt}
                    </p>
                  )}
                  <span className="text-primary font-medium text-sm inline-flex items-center gap-1 mt-auto">
                    Lees meer
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => scroll('prev')}
                disabled={page === 0}
                className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setPage(i); scrollRef.current?.scrollTo({ left: i * cardsPerPage * (scrollRef.current.scrollWidth / block.posts.length), behavior: 'smooth' }); }}
                    className={`w-2.5 h-2.5 rounded-full transition ${i === page ? 'bg-primary' : 'bg-border'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => scroll('next')}
                disabled={page === totalPages - 1}
                className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
