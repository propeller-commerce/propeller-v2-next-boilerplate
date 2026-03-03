import {
    useStore,
    Show,
    onUpdate,
} from '@builder.io/mitosis';
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

export default function CategoryDescription(props: CategoryDescriptionProps) {
    const state = useStore<CategoryDescriptionState>({
        expanded: false,
        html: '',

        getDescription() {
            if (!props.category?.description) return '';
            const match = props.category.description.find(
                (d: LocalizedString) => d.language === props.language
            );
            return match?.value || '';
        },

        getMaxLen() {
            return props.maxLength || 200;
        },

        shouldTruncate() {
            if (props.collapsed === false) return false;
            return this.html.length > this.getMaxLen();
        },

        getTruncated() {
            const plain = this.html.replace(/<[^>]*>/g, '');
            if (plain.length <= this.getMaxLen()) return this.html;
            const truncated = plain.substring(0, this.getMaxLen());
            return truncated.substring(0, truncated.lastIndexOf(' ')) + '…';
        },

        toggle() {
            this.expanded = !this.expanded;
        },
    });

    // Sync cached HTML whenever category or language changes.
    onUpdate(() => {
        state.html = state.getDescription();
    }, [props.category, props.language]);

    return (
        <Show when={!!state.html}>
            <div className={`mb-6 ${(props.className as string) || ''}`}>
                <Show when={!state.shouldTruncate() || state.expanded}>
                    <div
                        className="prose prose-slate max-w-none text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: state.html }}
                    />
                </Show>
                <Show when={state.shouldTruncate() && !state.expanded}>
                    <p className="text-muted-foreground">
                        {state.getTruncated()}
                    </p>
                </Show>
                <Show when={state.shouldTruncate()}>
                    <button
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
