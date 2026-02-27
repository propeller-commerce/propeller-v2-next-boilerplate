"use client";
import * as React from "react";
import type { Category } from "propeller-sdk-v2";

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

function CategoryShortDescription(props: CategoryShortDescriptionProps) {
  function getDescription(): string {
    if (!props.category?.shortDescription) return "";
    const match = props.category.shortDescription.find(
      (d: any) => d.language === props.language
    );
    return (match?.value as string) || "";
  }

  const description = getDescription();

  if (!description) return null;

  return (
    <div className={`mb-6 ${(props.className as string) || ""}`}>
      <div
        className="prose prose-slate max-w-none text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  );
}

export default CategoryShortDescription;
