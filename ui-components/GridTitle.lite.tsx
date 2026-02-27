import {
    Show,
} from '@builder.io/mitosis';

export interface GridTitleProps {
    // ── Required ────────────────────────────────────────────────────────────

    /**
     * The main heading text to display.
     * Typically the category name, search term, or brand name.
     */
    title: string;

    /**
     * Language code for the content.
     * Defaults to 'NL'.
     */
    language: string;

    // ── Optional ────────────────────────────────────────────────────────────

    /**
     * Override the heading tag level.
     * Defaults to 'h1'. Use 'h2' when the grid is embedded inside
     * a page that already has an h1.
     */
    headingLevel?: string;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

export default function GridTitle(props: GridTitleProps) {
    return (
        <div className={`mb-8 ${(props.className as string) || ''}`}>
            <div className="flex items-baseline gap-3 mb-3">
                <Show when={(props.headingLevel as string) === 'h2'}>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                        {props.title}
                    </h2>
                </Show>
                <Show when={(props.headingLevel as string) !== 'h2'}>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                        {props.title}
                    </h1>
                </Show>
            </div>
        </div>
    );
}
