import {
    useStore,
    Show,
    For,
    onUpdate,
} from '@builder.io/mitosis';
import {
    GraphQLClient,
    ProductService,
    AttributeResult,
    LocalizedString,
    Enums,
} from 'propeller-sdk-v2';

export interface ProductSpecificationsProps {
    /**
     * Initialised Propeller SDK GraphQL client.
     * Required when `productId` is set — used to fetch public attributes.
     */
    graphqlClient?: GraphQLClient;

    /**
     * Product ID to fetch attributes for.
     */
    productId?: number;

    /**
     * Pre-fetched attribute result items used as fallback when `productId` is not provided.
     * When `productId` is provided the component fetches its own data and this prop is ignored.
     */
    attributes?: AttributeResult[];

    /**
     * Language code used to resolve localised attribute labels.
     * Defaults to 'NL'.
     */
    language?: string;

    /**
     * Display layout for the specifications.
     * 'table' — two-column table (name | value). Default.
     * 'list'  — vertical label + value stacked rows.
     */
    layout?: string;

    /**
     * When true, groups attributes by their group field with a heading per section.
     * When false or omitted, displays a flat ungrouped table/list. Default: false.
     */
    grouping?: boolean;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface ProductSpecificationsState {
    internalAttributes: AttributeResult[];
    loading: boolean;
    getAttributes: () => AttributeResult[];
    getGroups: () => string[];
    getAttributesByGroup: (group: string) => AttributeResult[];
    getAttributeLabel: (attr: AttributeResult) => string;
    getAttributeValue: (attr: AttributeResult) => string;
    hasPublicAttributes: () => boolean;
}

export default function ProductSpecifications(props: ProductSpecificationsProps) {
    const state = useStore<ProductSpecificationsState>({
        internalAttributes: [],
        loading: false,

        getAttributes(): AttributeResult[] {
            // Prefer fetched internalAttributes; fall back to props.attributes
            const attrs = this.internalAttributes.length
                ? this.internalAttributes
                : ((props.attributes as AttributeResult[]) || []);
            return attrs.filter(
                (a: AttributeResult) =>
                    a.attributeDescription?.isPublic === true &&
                    this.getAttributeValue(a) !== '' && this.getAttributeValue(a) !== null && this.getAttributeValue(a) !== '0'
            );
        },

        getGroups(): string[] {
            const attrs = this.getAttributes();
            const seen: string[] = [];
            attrs.forEach((a: AttributeResult) => {
                const group = a.attributeDescription?.group || '';
                if (!seen.includes(group)) seen.push(group);
            });
            return seen;
        },

        getAttributesByGroup(group: string): AttributeResult[] {
            return this.getAttributes().filter(
                (a: AttributeResult) => (a.attributeDescription?.group || '') === group
            );
        },

        getAttributeLabel(attr: AttributeResult): string {
            const lang = (props.language as string) || 'NL';
            const descs = attr.attributeDescription?.descriptions || [];
            const match = descs.find((d: LocalizedString) => d.language === lang);
            return match?.value || attr.attributeDescription?.name || '';
        },

        getAttributeValue(attr: AttributeResult): string {
            const v = attr.value;
            if (!v) return '';
            const lang = (props.language as string) || 'NL';
            if (v.type === Enums.AttributeType.TEXT) {
                const entry = (v as any).textValues?.find((tv: any) => tv.language === lang);
                const vals = (entry?.values || []).filter(Boolean);
                return vals.join(', ');
            }
            if (v.type === Enums.AttributeType.ENUM) {
                const vals = ((v as any).enumValues || []).filter(Boolean);
                return vals.join(', ');
            }
            if (v.type === Enums.AttributeType.INT) {
                const val = (v as any).intValue;
                return val !== null && val !== undefined ? String(val) : '';
            }
            if (v.type === Enums.AttributeType.DECIMAL) {
                const val = (v as any).decimalValue;
                return val !== null && val !== undefined ? String(val) : '';
            }
            if (v.type === Enums.AttributeType.DATETIME) {
                return (v as any).dateTimeValue || '';
            }
            if (v.type === Enums.AttributeType.COLOR) {
                return (v as any).colorValue || '';
            }
            const fallback = v.value;
            if (fallback === null || fallback === undefined) return '';
            if (typeof fallback === 'boolean') return fallback ? 'Yes' : 'No';
            return String(fallback);
        },

        hasPublicAttributes(): boolean {
            return this.getAttributes().length > 0;
        },
    });

    onUpdate(() => {
        if (!props.productId || !props.graphqlClient) return;
        state.loading = true;
        const service = new ProductService(props.graphqlClient as GraphQLClient);
        service
            .getAttributeResultByProductId(props.productId as number, {
                attributeDescription: { isPublic: true },
                page: 1,
                offset: 2000,
            })
            .then((result: { items?: AttributeResult[] }) => {
                state.internalAttributes = result?.items || [];
                state.loading = false;
            })
            .catch(() => {
                state.loading = false;
            });
    }, [props.productId]);

    return (
        <Show when={!state.loading && state.hasPublicAttributes()}>
            <div className={`product-specifications ${(props.className as string) || ''}`}>

                {/* ── Flat mode (default) ── */}
                <Show when={!props.grouping}>
                    <Show when={(props.layout as string) !== 'list'}>
                        <div className="overflow-hidden rounded-lg border border-border">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-border">
                                    <For each={state.getAttributes()}>
                                        {(attr: AttributeResult, i: number) => (
                                            <tr key={i} className="odd:bg-white even:bg-muted/20">
                                                <td className="px-4 py-2 font-medium text-foreground w-1/2">
                                                    {state.getAttributeLabel(attr)}
                                                </td>
                                                <td className="px-4 py-2 text-muted-foreground">
                                                    {state.getAttributeValue(attr)}
                                                </td>
                                            </tr>
                                        )}
                                    </For>
                                </tbody>
                            </table>
                        </div>
                    </Show>
                    <Show when={(props.layout as string) === 'list'}>
                        <div className="space-y-3">
                            <For each={state.getAttributes()}>
                                {(attr: AttributeResult, i: number) => (
                                    <div key={i} className="flex flex-col gap-0.5">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            {state.getAttributeLabel(attr)}
                                        </span>
                                        <span className="text-sm text-foreground">
                                            {state.getAttributeValue(attr)}
                                        </span>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </Show>

                {/* ── Grouped mode (grouping=true) ── */}
                <Show when={!!props.grouping}>
                    <For each={state.getGroups()}>
                        {(group: string) => (
                            <div key={group} className="mb-6">
                                <Show when={!!group}>
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                        {group}
                                    </h4>
                                </Show>
                                <Show when={(props.layout as string) !== 'list'}>
                                    <div className="overflow-hidden rounded-lg border border-border">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-border">
                                                <For each={state.getAttributesByGroup(group)}>
                                                    {(attr: AttributeResult, i: number) => (
                                                        <tr key={i} className="odd:bg-white even:bg-muted/20">
                                                            <td className="px-4 py-2 font-medium text-foreground w-1/2">
                                                                {state.getAttributeLabel(attr)}
                                                            </td>
                                                            <td className="px-4 py-2 text-muted-foreground">
                                                                {state.getAttributeValue(attr)}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </For>
                                            </tbody>
                                        </table>
                                    </div>
                                </Show>
                                <Show when={(props.layout as string) === 'list'}>
                                    <div className="space-y-3">
                                        <For each={state.getAttributesByGroup(group)}>
                                            {(attr: AttributeResult, i: number) => (
                                                <div key={i} className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                        {state.getAttributeLabel(attr)}
                                                    </span>
                                                    <span className="text-sm text-foreground">
                                                        {state.getAttributeValue(attr)}
                                                    </span>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </Show>
                            </div>
                        )}
                    </For>
                </Show>

            </div>
        </Show>
    );
}
