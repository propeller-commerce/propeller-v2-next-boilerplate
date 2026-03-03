import {
    useStore,
    Show,
    For,
} from '@builder.io/mitosis';
import {
    PaginatedMediaDocumentResponse,
    MediaDocument,
    LocalizedDocument,
    LocalizedString,
} from 'propeller-sdk-v2';

export interface ProductDownloadsProps {
    /**
     * Media documents for the product.
     * Obtain from `product.media.documents`.
     */
    downloads: PaginatedMediaDocumentResponse;

    /**
     * Language code used to resolve the correct localised document URL and label.
     */
    language: string;

    /**
     * Override any UI string.
     * Available keys: title, download
     */
    labels?: Record<string, string>;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface ProductDownloadsState {
    hasItems: () => boolean;
    getDownloadItems: () => MediaDocument[];
    getDocumentUrl: (doc: MediaDocument) => string;
    getDocumentName: (doc: MediaDocument) => string;
    getDocumentMime: (doc: MediaDocument) => string;
    getLabel: (key: string, fallback: string) => string;
}

export default function ProductDownloads(props: ProductDownloadsProps) {
    const state = useStore<ProductDownloadsState>({
        hasItems(): boolean {
            const d = props.downloads as PaginatedMediaDocumentResponse;
            return !!d?.items && d.items.length > 0;
        },

        getDownloadItems(): MediaDocument[] {
            const d = props.downloads as PaginatedMediaDocumentResponse;
            return d?.items || [];
        },

        getDocumentUrl(doc: MediaDocument): string {
            const lang = (props.language as string) || 'NL';
            const docs = doc.documents || [];
            const match = docs.find((d: LocalizedDocument) => d.language === lang);
            return match?.originalUrl || docs?.[0]?.originalUrl || '';
        },

        getDocumentName(doc: MediaDocument): string {
            const lang = (props.language as string) || 'NL';
            const alts = doc.alt || [];
            const match = alts.find((a: LocalizedString) => a.language === lang);
            return match?.value || alts?.[0]?.value || 'Download';
        },

        getDocumentMime(doc: MediaDocument): string {
            const lang = (props.language as string) || 'NL';
            const docs = doc.documents || [];
            const match = docs.find((d: LocalizedDocument) => d.language === lang);
            return match?.mimeType || docs?.[0]?.mimeType || '';
        },

        getLabel(key: string, fallback: string): string {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },
    });

    return (
        <Show when={state.hasItems()}>
            <div className={`product-downloads ${(props.className as string) || ''}`}>
                <h3 className="text-base font-semibold text-foreground mb-3">
                    {state.getLabel('title', 'Downloads')}
                </h3>
                <ul className="space-y-2">
                    <For each={state.getDownloadItems()}>
                        {(doc: MediaDocument, index: number) => (
                            <li key={index}>
                                <Show when={!!state.getDocumentUrl(doc)}>
                                    <a
                                        href={state.getDocumentUrl(doc)}
                                        target="_blank"
                                        download
                                        className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 text-sm text-foreground hover:bg-muted/30 hover:border-primary/40 transition-colors group"
                                    >
                                        {/* File icon */}
                                        <svg
                                            className="h-5 w-5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        <span className="flex-1 min-w-0 truncate">
                                            {state.getDocumentName(doc)}
                                        </span>
                                        {/* Download arrow icon */}
                                        <svg
                                            className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                            />
                                        </svg>
                                    </a>
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
            </div>
        </Show>
    );
}
