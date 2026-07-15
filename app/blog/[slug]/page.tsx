import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import DynamicBlockRenderer from '@/components/cms/DynamicBlockRenderer';
import { getArticle, getAllArticleSlugs } from '@/lib/cms';
import { getTranslations } from '@/lib/i18n/server';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(dateString: string | null) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const [article, store] = await Promise.all([getArticle(slug), cookies()]);

  if (!article) {
    notFound();
  }

  const locale = store.get('preferred_language')?.value || process.env.BOILERPLATE_DEFAULT_LANGUAGE || 'NL';
  const t = getTranslations(locale, 'Blog');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <HeaderServer />
      <main className="flex-1">
        {/* Hero / Cover image */}
        {article.cover && (
          <div className="relative h-[400px] w-full overflow-hidden bg-muted">
            <Image
              src={article.cover.url}
              alt={article.cover.alternativeText || article.title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="container-width">
                <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                  {article.title}
                </h1>
              </div>
            </div>
          </div>
        )}

        <article className="py-10">
          <div className="container-width max-w-3xl mx-auto">
            {/* Title (when no cover image) */}
            {!article.cover && (
              <h1 className="mb-6 text-3xl font-bold md:text-4xl">{article.title}</h1>
            )}

            {/* Meta: author, date, category */}
            <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {article.author && (
                <div className="flex items-center gap-2">
                  {article.author.avatar ? (
                    <Image
                      src={article.author.avatar.url}
                      alt={article.author.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {article.author.name.charAt(0)}
                    </div>
                  )}
                  <span>{article.author.name}</span>
                </div>
              )}
              {article.publishedAt && (
                <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
              )}
              {article.category && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {article.category.name}
                </span>
              )}
            </div>

            {/* Description */}
            {article.description && (
              <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
                {article.description}
              </p>
            )}

            {/* Content blocks */}
            {article.blocks.length > 0 && (
              <DynamicBlockRenderer blocks={article.blocks} />
            )}

            {/* Back link */}
            <div className="mt-12 border-t border-border pt-6">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                {t.backToBlog}
              </Link>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
