import {
    useStore,
    Show,
} from '@builder.io/mitosis';
import type { Category } from 'propeller-sdk-v2';

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
    getDescription(): string;
}

export default function CategoryShortDescription(props: CategoryShortDescriptionProps) {
    const state = useStore<CategoryShortDescriptionState>({
        getDescription() {
            if (!props.category?.shortDescription) return '';
            const match = props.category.shortDescription.find(
                (d: any) => d.language === props.language
            );
            return (match?.value as string) || '';
        },
    });

    return (
        <Show when={!!state.getDescription()}>
            <div className={`mb-6 ${(props.className as string) || ''}`}>
                <div
                    className="prose prose-slate max-w-none text-muted-foreground"
                    innerHTML={state.getDescription()}
                />
            </div>
        </Show>
    );
}
