import {
    useStore,
    Show,
    For,
} from '@builder.io/mitosis';
import {
    PaginatedMediaVideoResponse,
    MediaVideo,
    LocalizedVideo,
    LocalizedString,
} from 'propeller-sdk-v2';

export interface ProductVideosProps {
    /**
     * Media videos for the product.
     * Obtain from `product.media.videos`.
     */
    videos: PaginatedMediaVideoResponse;

    /**
     * Language code used to resolve the correct localised video URI.
     */
    language: string;

    /**
     * Override any UI string.
     * Available keys: title, empty
     */
    labels?: Record<string, string>;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface ProductVideosState {
    hasItems: () => boolean;
    getVideoItems: () => MediaVideo[];
    getVideoUri: (video: MediaVideo) => string;
    getVideoTitle: (video: MediaVideo) => string;
    isEmbeddable: (uri: string) => boolean;
    getEmbedUrl: (uri: string) => string;
    getLabel: (key: string, fallback: string) => string;
}

export default function ProductVideos(props: ProductVideosProps) {
    const state = useStore<ProductVideosState>({
        hasItems(): boolean {
            const v = props.videos as PaginatedMediaVideoResponse;
            return !!v?.items && v.items.length > 0;
        },

        getVideoItems(): MediaVideo[] {
            const v = props.videos as PaginatedMediaVideoResponse;
            return v?.items || [];
        },

        getVideoUri(video: MediaVideo): string {
            const lang = (props.language as string) || 'NL';
            const vids = video.videos || [];
            const match = vids.find((v: LocalizedVideo) => v.language === lang);
            return match?.uri || vids?.[0]?.uri || '';
        },

        getVideoTitle(video: MediaVideo): string {
            const lang = (props.language as string) || 'NL';
            const alts = video.alt || [];
            const match = alts.find((a: LocalizedString) => a.language === lang);
            return match?.value || alts?.[0]?.value || 'Video';
        },

        isEmbeddable(uri: string): boolean {
            return (
                uri.includes('youtube.com') ||
                uri.includes('youtu.be') ||
                uri.includes('vimeo.com')
            );
        },

        getEmbedUrl(uri: string): string {
            // YouTube watch URL → embed URL
            if (uri.includes('youtube.com/watch')) {
                const url = new URL(uri);
                const videoId = url.searchParams.get('v') || '';
                return `https://www.youtube.com/embed/${videoId}`;
            }
            // YouTube short URL
            if (uri.includes('youtu.be/')) {
                const videoId = uri.split('youtu.be/')[1]?.split('?')[0] || '';
                return `https://www.youtube.com/embed/${videoId}`;
            }
            // Vimeo
            if (uri.includes('vimeo.com/')) {
                const videoId = uri.split('vimeo.com/')[1]?.split('?')[0] || '';
                return `https://player.vimeo.com/video/${videoId}`;
            }
            return uri;
        },

        getLabel(key: string, fallback: string): string {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },
    });

    return (
        <div className={`product-videos ${(props.className as string) || ''}`}>
            <Show when={state.hasItems()}>
                <h3 className="text-base font-semibold text-foreground mb-3">
                    {state.getLabel('title', 'Videos')}
                </h3>
            </Show>
            <Show when={state.hasItems()}>
                <div className="space-y-4">
                    <For each={state.getVideoItems()}>
                        {(video: MediaVideo, index: number) => (
                            <div key={index} className="rounded-lg overflow-hidden border border-border bg-black">
                                <Show when={!!state.getVideoUri(video)}>
                                    {/* Embeddable (YouTube / Vimeo) */}
                                    <Show when={state.isEmbeddable(state.getVideoUri(video))}>
                                        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                            <iframe
                                                src={state.getEmbedUrl(state.getVideoUri(video))}
                                                title={state.getVideoTitle(video)}
                                                className="absolute inset-0 w-full h-full"
                                                loading="lazy"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    </Show>

                                    {/* Native video player */}
                                    <Show when={!state.isEmbeddable(state.getVideoUri(video))}>
                                        <video
                                            controls
                                            className="w-full"
                                            preload="metadata"
                                        >
                                            <source src={state.getVideoUri(video)} />
                                        </video>
                                    </Show>
                                </Show>
                            </div>
                        )}
                    </For>
                </div>
            </Show>
            <Show when={!state.hasItems()}>
                <p className="text-sm text-muted-foreground">
                    {state.getLabel('empty', 'No videos')}
                </p>
            </Show>
        </div>
    );
}
