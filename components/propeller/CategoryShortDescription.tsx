import * as React from 'react';
import type { Category, LocalizedString } from 'propeller-sdk-v2';

export interface CategoryShortDescriptionProps {
  // ── Required ────────────────────────────────────────────────────────────

  /**
   * Language code used to resolve the correct localised short description
   * from `category.shortDescription`.
   */
  language: string;

  // ── Optional ────────────────────────────────────────────────────────────

  /**
   * Propeller Category object.
   * The component reads `category.shortDescription` (an array of LocalizedString)
   * and renders the matching language entry as HTML.
   */
  category?: Category;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
interface CategoryShortDescriptionState {
  html: () => string;
}
function CategoryShortDescription(props: CategoryShortDescriptionProps) {
  function html(): ReturnType<CategoryShortDescriptionState['html']> {
    if (!props.category?.shortDescription) return '';
    const match = props.category.shortDescription.find(
      (d: LocalizedString) => d.language === props.language
    );
    return match?.value || '';
  }
  return (
    <>
      {!!html() ? (
        <>
          <div className={`propeller-category-short-description mb-6 ${(props.className as string) || ''}`}>
            <div
              className="propeller-category-short-description__content prose prose-slate max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{
                __html: html(),
              }}
            />
          </div>
        </>
      ) : null}
    </>
  );
}

export default CategoryShortDescription;
