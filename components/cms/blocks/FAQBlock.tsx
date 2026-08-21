'use client';

import { ChevronDown } from 'lucide-react';
import type { CmsFaq } from '@/lib/cms/types';

export default function FAQBlock({ block }: { block: CmsFaq }) {
  return (
    <section className="bg-primary/5 py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="mb-8 text-center text-3xl font-bold">{block.title}</h2>

        <div className="space-y-3">
          {block.questions.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-border bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="px-6 pb-4 text-muted-foreground">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
