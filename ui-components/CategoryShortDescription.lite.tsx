import {
    useStore,
    Show,
    onUpdate,
} from '@builder.io/mitosis';
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
    /** Cached resolved HTML — updated via onUpdate whenever category/language changes. */
    html: string;
    getDescription(): string;
}

export default function CategoryShortDescription(props: CategoryShortDescriptionProps) {
    const state = useStore<CategoryShortDescriptionState>({
        html: '',

        getDescription() {
            if (!props.category?.shortDescription) return '';
            const match = props.category.shortDescription.find(
                (d: LocalizedString) => d.language === props.language
            );
            return match?.value || '';
        },
    });

    // Sync cached HTML whenever category or language changes.
    onUpdate(() => {
        state.html = state.getDescription();
    }, [props.category, props.language]);

    return (
        <Show when={!!state.html}>
            <div className={`mb-6 ${(props.className as string) || ''}`}>
                <div className="prose prose-slate max-w-none text-muted-foreground">{state.html}</div>
            </div>
        </Show>
    );
}
