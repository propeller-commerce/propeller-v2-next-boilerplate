'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CmsContactForm } from '@/lib/cms/types';

export default function ContactForm({ block }: { block: CmsContactForm }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // Simulate form submission — replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="py-16">
        <div className="container-width max-w-2xl mx-auto text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8">
            <p className="text-green-800 text-lg font-medium">{block.successMessage}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container-width max-w-2xl mx-auto">
        {block.title && (
          <h2 className="text-3xl font-bold tracking-tight mb-4">{block.title}</h2>
        )}
        {block.description && (
          <p className="text-muted-foreground mb-8">{block.description}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="contact-name" className="text-sm font-medium">Name</label>
              <Input id="contact-name" name="name" required placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <label htmlFor="contact-email" className="text-sm font-medium">Email</label>
              <Input id="contact-email" name="email" type="email" required placeholder="your@email.com" />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="contact-subject" className="text-sm font-medium">Subject</label>
            <Input id="contact-subject" name="subject" required placeholder="What is this about?" />
          </div>
          <div className="space-y-2">
            <label htmlFor="contact-message" className="text-sm font-medium">Message</label>
            <textarea
              id="contact-message"
              name="message"
              required
              rows={5}
              placeholder="Your message..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto px-8" isLoading={loading}>
            Send Message
          </Button>
        </form>
      </div>
    </section>
  );
}
