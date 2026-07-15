import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import { getArticles } from '@/lib/cms';
import { getTranslations } from '@/lib/i18n/server';
import type { CmsArticle } from '@/lib/cms/types';

function formatDate(dateString: string | null) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ArticleCard({ article, readMoreLabel }: { article: CmsArticle; readMoreLabel: string }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
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
        {article.category && (
          <span className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm text-foreground text-xs font-medium px-3 py-1 rounded-full border border-border shadow-sm">
            {article.category.name}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {article.author ? (
              article.author.avatar ? (
                <Image
                  src={article.author.avatar.url}
                  alt={article.author.name}
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {article.author.name.charAt(0)}
                </div>
              )
            ) : null}
            {article.author && (
              <span className="text-sm text-muted-foreground font-medium">{article.author.name}</span>
            )}
          </div>
          {article.publishedAt && (
            <time dateTime={article.publishedAt} className="text-sm text-muted-foreground">
              {formatDate(article.publishedAt)}
            </time>
          )}
        </div>
        <h2 className="mb-2 text-lg font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {article.title}
        </h2>
        {article.description && (
          <p className="line-clamp-3 text-sm text-muted-foreground mb-4 flex-1">{article.description}</p>
        )}
        <span className="text-primary font-medium text-sm inline-flex items-center gap-1 mt-auto">
          {readMoreLabel}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export default async function BlogPage() {
  const [articles, store] = await Promise.all([getArticles(), cookies()]);
  const locale = store.get('preferred_language')?.value || process.env.BOILERPLATE_DEFAULT_LANGUAGE || 'NL';
  const t = getTranslations(locale, 'Blog');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <HeaderServer />
      <main className="flex-1">
        <section className="py-12">
          <div className="container-width">
            <h1 className="mb-8 text-3xl font-bold">{t.title}</h1>
            {articles.length > 0 ? (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} readMoreLabel={t.readMore} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">{t.noArticles}</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
