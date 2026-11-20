import sanitizeHtml from 'sanitize-html';

/**
 * CMS rich text reaches the page through `dangerouslySetInnerHTML`
 * (components/cms/blocks/RichTextBlock.tsx) on the shop's own origin, and CMS
 * editors are not treated as fully trusted. Every provider runs its rich-text
 * HTML through this before it leaves the provider: prose tags, links, images
 * and tables stay; scripts, event handlers, iframes, forms, inline styles and
 * `javascript:` URLs go.
 */
// The same allowlist as propeller-vue's src/server/sanitizeRichText.js.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'del', 'ins'],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'title', 'rel'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
    th: ['align', 'colspan', 'rowspan', 'scope'],
    td: ['align', 'colspan', 'rowspan'],
    ol: ['start', 'type'],
    code: ['class'],
  },
  // Only language-* on <code> (markdown fences); no other classes.
  allowedClasses: { code: ['language-*'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    // A new-tab link can't reach back into the shop window.
    a: (tagName, attribs) =>
      attribs.target === '_blank' ? { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } } : { tagName, attribs },
  },
};

/** `html` reduced to the prose allowlist above. */
export function sanitizeRichText(html: string): string {
  return html ? sanitizeHtml(html, OPTIONS) : '';
}
