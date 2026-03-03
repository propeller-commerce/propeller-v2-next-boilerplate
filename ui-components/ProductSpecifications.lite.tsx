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
} from 'propeller-sdk-v2';

export interface ProductSpecificationsProps {
    /**
     * Initialised Propeller SDK GraphQL client.
     * Required when `attributes` is not provided and `productId` is set —
     * used to internally fetch public attributes for the product.
     */
    graphqlClient?: GraphQLClient;

    /**
     * Product ID to fetch attributes for.
     * Only used when `attributes` is not provided.
     */
    productId?: number;

    /**
     * Pre-fetched attribute result items.
     * When provided the component skips internal fetching.
     * Obtain from `product.attributes?.items` or a separate attribute fetch.
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
            const attrs = (props.attributes as AttributeResult[]) || this.internalAttributes;
            return attrs.filter(
                (a: AttributeResult) => a.attributeDescription?.isPublic === true
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
            const val = attr.value?.value;
            if (val === null || val === undefined) return '';
            if (typeof val === 'boolean') return val ? 'Yes' : 'No';
            return String(val);
        },

        hasPublicAttributes(): boolean {
            return this.getAttributes().length > 0;
        },
    });

    onUpdate(() => {
        if (props.attributes) return;
        if (!props.productId || !props.graphqlClient) return;
        state.loading = true;
        const service = new ProductService(props.graphqlClient as GraphQLClient);
        service
            .getAttributeResultByProductId(props.productId as number, {
                attributeDescription: { isPublic: true },
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
                <For each={state.getGroups()}>
                    {(group: string) => (
                        <div key={group} className="mb-6">
                            {/* Group heading (only if group name is non-empty) */}
                            <Show when={!!group}>
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                    {group}
                                </h4>
                            </Show>

                            {/* Table layout */}
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

                            {/* List layout */}
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
            </div>
        </Show>
    );
}
