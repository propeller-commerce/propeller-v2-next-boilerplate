'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import type { Category, LocalizedString } from 'propeller-sdk-v2';

export interface CategoryDescriptionProps {
  // ── Required ────────────────────────────────────────────────────────────

  /**
   * Language code used to resolve the correct localised description
   * from `category.description`.
   */
  language: string;

  // ── Optional ────────────────────────────────────────────────────────────

  /**
   * Propeller Category object.
   * The component reads `category.description` (an array of LocalizedString)
   * and renders the matching language entry as HTML.
   */
  category?: Category;

  /**
   * When `true` (default), the description is truncated to `maxLength`
   * characters and a "Read more" / "Read less" toggle is shown.
   */
  collapsed?: boolean;

  /**
   * Maximum number of characters to display before truncating.
   * Only applies when `collapsed` is `true`.
   * Defaults to 200.
   */
  maxLength?: number;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
interface CategoryDescriptionState {
  expanded: boolean;
  /** Cached resolved HTML — updated via onUpdate whenever category/language changes. */
  html: string;
  getDescription(): string;
  getMaxLen(): number;
  shouldTruncate(): boolean;
  getTruncated(): string;
  toggle(): void;
}

function CategoryDescription(props: CategoryDescriptionProps) {
  const [expanded, setExpanded] = useState<CategoryDescriptionState['expanded']>(() => false);

  const [html, setHtml] = useState<CategoryDescriptionState['html']>(() => '');

  function getDescription(): ReturnType<CategoryDescriptionState['getDescription']> {
    if (!props.category?.description) return '';
    const match = props.category.description.find(
      (d: LocalizedString) => d.language === props.language
    );
    return match?.value || '';
  }

  function getMaxLen(): ReturnType<CategoryDescriptionState['getMaxLen']> {
    return props.maxLength || 200;
  }

  function shouldTruncate(): ReturnType<CategoryDescriptionState['shouldTruncate']> {
    if (props.collapsed === false) return false;
    return html.length > getMaxLen();
  }

  function getTruncated(): ReturnType<CategoryDescriptionState['getTruncated']> {
    const plain = html.replace(/<[^>]*>/g, '');
    if (plain.length <= getMaxLen()) return html;
    const truncated = plain.substring(0, getMaxLen());
    return truncated.substring(0, truncated.lastIndexOf(' ')) + '…';
  }

  function toggle(): ReturnType<CategoryDescriptionState['toggle']> {
    setExpanded(!expanded);
  }

  useEffect(() => {
    setHtml(getDescription());
  }, [props.category, props.language]);

  return (
    <>
      {!!html ? (
        <>
          <div className={`mb-6 ${(props.className as string) || ''}`}>
            {!shouldTruncate() || expanded ? (
              <div
                className="prose prose-slate max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: html,
                }}
              />
            ) : null}
            {shouldTruncate() && !expanded ? (
              <p className="text-muted-foreground">{getTruncated()}</p>
            ) : null}
            {shouldTruncate() ? (
              <button
                className="mt-2 text-sm font-medium text-primary hover:underline"
                onClick={(event) => toggle()}
              >
                {expanded ? <>Read less</> : null}
                {!expanded ? <>Read more</> : null}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}

export default CategoryDescription;
