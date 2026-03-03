import {
    useStore,
    Show,
    onUpdate,
} from '@builder.io/mitosis';
import type { Product, Cluster, LocalizedString } from 'propeller-sdk-v2';

export interface ProductDescriptionProps {
    /**
     * Product or Cluster object.
     * The component reads `product.descriptions` (an array of LocalizedString)
     * and renders the matching language entry as HTML.
     */
    product: Product | Cluster;

    /**
     * Language code used to resolve the correct localised description.
     * Defaults to 'NL'.
     */
    language?: string;

    /**
     * When true, the description is initially collapsed to `maxLength` characters.
     * A "Read more" / "Read less" toggle is shown.
     * Defaults to false.
     */
    collapsed?: boolean;

    /**
     * Maximum number of characters shown when collapsed.
     * Set to 0 to display the entire description without truncation.
     * Defaults to 0.
     */
    maxLength?: number;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface ProductDescriptionState {
    expanded: boolean;
    html: string;
    getDescription: () => string;
    getMaxLen: () => number;
    shouldTruncate: () => boolean;
    getTruncated: () => string;
    toggle: () => void;
}

export default function ProductDescription(props: ProductDescriptionProps) {
    const state = useStore<ProductDescriptionState>({
        expanded: false,
        html: '',

        getDescription(): string {
            const product = props.product as Product;
            if (!product?.descriptions) return '';
            const lang = (props.language as string) || 'NL';
            const match = product.descriptions.find(
                (d: LocalizedString) => d.language === lang
            );
            return match?.value || product.descriptions?.[0]?.value || '';
        },

        getMaxLen(): number {
            const max = props.maxLength;
            if (!max || (max as number) <= 0) return 0;
            return max as number;
        },

        shouldTruncate(): boolean {
            if (props.collapsed === false) return false;
            if (!props.collapsed) return false;
            const maxLen = this.getMaxLen();
            if (maxLen === 0) return false;
            const plain = this.html.replace(/<[^>]*>/g, '');
            return plain.length > maxLen;
        },

        getTruncated(): string {
            const plain = this.html.replace(/<[^>]*>/g, '');
            const maxLen = this.getMaxLen();
            if (maxLen === 0 || plain.length <= maxLen) return this.html;
            const truncated = plain.substring(0, maxLen);
            return truncated.substring(0, truncated.lastIndexOf(' ')) + '\u2026';
        },

        toggle(): void {
            this.expanded = !this.expanded;
        },
    });

    onUpdate(() => {
        state.html = state.getDescription();
    }, [props.product, props.language]);

    return (
        <Show when={!!state.html}>
            <div className={`product-description ${(props.className as string) || ''}`}>
                {/* Full HTML */}
                <Show when={!state.shouldTruncate() || state.expanded}>
                    <div
                        className="prose prose-slate max-w-none text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: state.html }}
                    />
                </Show>

                {/* Truncated plain text */}
                <Show when={state.shouldTruncate() && !state.expanded}>
                    <p className="text-muted-foreground">
                        {state.getTruncated()}
                    </p>
                </Show>

                {/* Toggle button */}
                <Show when={state.shouldTruncate()}>
                    <button
                        type="button"
                        className="mt-2 text-sm font-medium text-primary hover:underline"
                        onClick={() => state.toggle()}
                    >
                        <Show when={state.expanded}>Read less</Show>
                        <Show when={!state.expanded}>Read more</Show>
                    </button>
                </Show>
            </div>
        </Show>
    );
}
