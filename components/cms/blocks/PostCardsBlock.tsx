import Image from 'next/image';
import Link from 'next/link';
import type { CmsPostCards } from '@/lib/cms/types';

export default function PostCardsBlock({ block }: { block: CmsPostCards }) {
  return (
    <section className="py-16 lg:py-20">
      <div className="container-width text-center mb-10">
        <h2 className="text-3xl font-bold">{block.title}</h2>
        {block.subtitle && (
          <p className="text-muted-foreground mt-2">{block.subtitle}</p>
        )}
      </div>

      <div className="container-width grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {block.posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-md transition"
          >
            {post.cover ? (
              <Image
                src={post.cover.url}
                alt={post.cover.alternativeText || post.title}
                width={post.cover.width}
                height={post.cover.height}
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="aspect-video w-full bg-muted" />
            )}

            <div className="p-4">
              {post.category && (
                <span className="text-xs font-medium text-primary uppercase mb-2 block">
                  {post.category}
                </span>
              )}
              <h3 className="font-semibold text-sm line-clamp-2 mb-2">{post.title}</h3>
              {post.excerpt && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {post.excerpt}
                </p>
              )}
              {(post.author || post.readTime) && (
                <div className="flex items-center gap-2">
                  {post.author?.avatar && (
                    <Image
                      src={post.author.avatar.url}
                      alt={post.author.avatar.alternativeText || post.author.name}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  )}
                  {post.author && (
                    <span className="text-xs text-muted-foreground">{post.author.name}</span>
                  )}
                  {post.author && post.readTime && (
                    <span className="text-xs text-muted-foreground">&middot;</span>
                  )}
                  {post.readTime && (
                    <span className="text-xs text-muted-foreground">{post.readTime} min read</span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
