'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CmsContactForm } from '@/lib/cms/types';
import { useTranslations } from '@/lib/i18n/client';

export default function ContactForm({ block }: { block: CmsContactForm }) {
  const t = useTranslations('ContactForm');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasSplitLayout = !!(block.phone || block.email);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    setSubmitted(true);
  };

  const form = submitted ? (
    <div className="bg-green-50 border border-green-200 rounded-lg p-8">
      <p className="text-green-800 text-lg font-medium">{block.successMessage}</p>
    </div>
  ) : (
    <div className="bg-card rounded-xl border border-border p-6">
      {block.formTitle && (
        <h3 className="text-xl font-semibold mb-4">{block.formTitle}</h3>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="contact-name" className="text-sm font-medium">{t.name}</label>
            <Input id="contact-name" name="name" required placeholder={t.namePlaceholder} />
          </div>
          <div className="space-y-2">
            <label htmlFor="contact-email" className="text-sm font-medium">{t.email}</label>
            <Input id="contact-email" name="email" type="email" required placeholder={t.emailPlaceholder} />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="contact-message" className="text-sm font-medium">{t.message}</label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={4}
            placeholder={t.messagePlaceholder}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" isLoading={loading}>
          {t.send}
        </Button>
      </form>
    </div>
  );

  if (!hasSplitLayout) {
    return (
      <section className="py-16">
        <div className="container-width max-w-2xl mx-auto">
          {block.title && <h2 className="text-3xl font-bold tracking-tight mb-4">{block.title}</h2>}
          {block.description && <p className="text-muted-foreground mb-8">{block.description}</p>}
          {form}
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-20 bg-primary/5">
      <div className="container-width">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            {block.title && (
              <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
            )}
            {block.description && (
              <p className="text-muted-foreground text-lg">{block.description}</p>
            )}
            <div className="space-y-4 pt-4">
              {block.phone && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <a href={`tel:${block.phone}`} className="text-foreground font-medium hover:text-primary transition-colors">{block.phone}</a>
                </div>
              )}
              {block.email && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <a href={`mailto:${block.email}`} className="text-foreground font-medium hover:text-primary transition-colors">{block.email}</a>
                </div>
              )}
            </div>
          </div>
          <div>{form}</div>
        </div>
      </div>
    </section>
  );
}
