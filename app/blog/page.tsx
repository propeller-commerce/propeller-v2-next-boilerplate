import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getArticles } from '@/lib/cms';
import type { CmsArticle } from '@/lib/cms/types';

function formatDate(dateString: string | null) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ArticleCard({ article }: { article: CmsArticle }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {article.cover ? (
          <Image
            src={article.cover.url}
            alt={article.cover.alternativeText || article.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
          {article.category && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {article.category.name}
            </span>
          )}
          {article.publishedAt && (
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          )}
        </div>
        <h2 className="mb-2 text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
          {article.title}
        </h2>
        {article.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{article.description}</p>
        )}
        {article.author && (
          <div className="mt-auto flex items-center gap-2 pt-4">
            {article.author.avatar ? (
              <Image
                src={article.author.avatar.url}
                alt={article.author.name}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {article.author.name.charAt(0)}
              </div>
            )}
            <span className="text-sm text-muted-foreground">{article.author.name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default async function BlogPage() {
  const articles = await getArticles();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="py-12">
          <div className="container-width">
            <h1 className="mb-8 text-3xl font-bold">Blog</h1>
            {articles.length > 0 ? (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No articles published yet.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
