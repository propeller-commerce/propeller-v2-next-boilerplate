"use client";
import * as React from "react";
import type { Category } from "propeller-sdk-v2";

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

function CategoryDescription(props: CategoryDescriptionProps) {
  const [expanded, setExpanded] = React.useState(false);

  function getDescription(): string {
    if (!props.category?.description) return "";
    const match = props.category.description.find(
      (d: any) => d.language === props.language
    );
    return (match?.value as string) || "";
  }

  function getMaxLen(): number {
    return props.maxLength || 200;
  }

  function shouldTruncate(): boolean {
    if (props.collapsed === false) return false;
    return getDescription().length > getMaxLen();
  }

  function getTruncated(): string {
    const desc = getDescription();
    const plain = desc.replace(/<[^>]*>/g, "");
    if (plain.length <= getMaxLen()) return desc;
    const truncated = plain.substring(0, getMaxLen());
    return truncated.substring(0, truncated.lastIndexOf(" ")) + "…";
  }

  function toggle() {
    setExpanded(!expanded);
  }

  const description = getDescription();

  if (!description) return null;

  return (
    <div className={`mb-6 ${(props.className as string) || ""}`}>
      {!shouldTruncate() || expanded ? (
        <div
          className="prose prose-slate max-w-none text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      ) : null}
      {shouldTruncate() && !expanded ? (
        <p className="text-muted-foreground">{getTruncated()}</p>
      ) : null}
      {shouldTruncate() ? (
        <button
          className="mt-2 text-sm font-medium text-primary hover:underline"
          onClick={() => toggle()}
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

export default CategoryDescription;
