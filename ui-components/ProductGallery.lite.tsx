import {
    useStore,
    Show,
    For,
} from '@builder.io/mitosis';

export interface ProductGalleryProps {
    /**
     * Array of image URLs to display.
     * Obtain from: `product.media?.images?.items?.[0]?.imageVariants?.map(v => v.url)`
     * Component is in skeleton/loading state when this is an empty array.
     */
    images: string[];

    /** Show image thumbnails below the main image. Defaults to true. */
    showThumbnails?: boolean;

    /** Enable cursor-zoom-in hint on the main image. Defaults to true. */
    enableZoom?: boolean;

    /** Enable fullscreen lightbox when clicking the main image. Defaults to true. */
    enableLightbox?: boolean;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface ProductGalleryState {
    selectedIndex: number;
    lightboxOpen: boolean;
    getImages: () => string[];
    getMainImage: () => string;
    hasThumbnails: () => boolean;
    selectImage: (index: number) => void;
    openLightbox: () => void;
    closeLightbox: () => void;
    prevImage: () => void;
    nextImage: () => void;
}

export default function ProductGallery(props: ProductGalleryProps) {
    const state = useStore<ProductGalleryState>({
        selectedIndex: 0,
        lightboxOpen: false,

        getImages(): string[] {
            return (props.images as string[]) || [];
        },

        getMainImage(): string {
            const images = this.getImages();
            if (!images || images.length === 0) return '';
            const idx = this.selectedIndex;
            return images[idx] || images[0] || '';
        },

        hasThumbnails(): boolean {
            const images = this.getImages();
            return !!images && images.length > 1;
        },

        selectImage(index: number): void {
            this.selectedIndex = index;
        },

        openLightbox(): void {
            if (props.enableLightbox !== false) {
                this.lightboxOpen = true;
            }
        },

        closeLightbox(): void {
            this.lightboxOpen = false;
        },

        prevImage(): void {
            const images = this.getImages();
            const len = images?.length || 0;
            if (len === 0) return;
            this.selectedIndex = (this.selectedIndex - 1 + len) % len;
        },

        nextImage(): void {
            const images = this.getImages();
            const len = images?.length || 0;
            if (len === 0) return;
            this.selectedIndex = (this.selectedIndex + 1) % len;
        },
    });

    return (
        <div className={`product-gallery ${(props.className as string) || ''}`}>
            {/* Main image area */}
            <div className="relative aspect-square bg-white overflow-hidden">
                {/* Placeholder when no images */}
                <Show when={state.getImages().length === 0}>
                    <div className="flex h-full w-full items-center justify-center bg-slate-50">
                        <svg
                            className="h-24 w-24 text-slate-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                </Show>

                {/* Main image */}
                <Show when={state.getImages().length > 0}>
                    <img
                        src={state.getMainImage()}
                        alt="Product image"
                        className={`h-full w-full object-contain p-8 transition-transform duration-200 ${props.enableZoom !== false ? 'cursor-zoom-in hover:scale-105' : ''}`}
                        onClick={() => state.openLightbox()}
                    />
                </Show>
            </div>

            {/* Thumbnail strip */}
            <Show when={props.showThumbnails !== false && state.hasThumbnails()}>
                <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                    <For each={state.getImages()}>
                        {(img: string, index: number) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => state.selectImage(index)}
                                className={`relative flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all bg-white ${state.selectedIndex === index ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'}`}
                            >
                                <img
                                    src={img}
                                    alt={`Product image ${index + 1}`}
                                    className="w-full h-full object-contain p-1"
                                />
                            </button>
                        )}
                    </For>
                </div>
            </Show>

            {/* Lightbox overlay */}
            <Show when={state.lightboxOpen}>
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => state.closeLightbox()}
                >
                    {/* Close button */}
                    <button
                        type="button"
                        className="absolute top-4 right-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
                        onClick={(e) => { e.stopPropagation(); state.closeLightbox(); }}
                        aria-label="Close"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Prev arrow */}
                    <Show when={state.hasThumbnails()}>
                        <button
                            type="button"
                            className="absolute left-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
                            onClick={(e) => { e.stopPropagation(); state.prevImage(); }}
                            aria-label="Previous image"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    </Show>

                    {/* Lightbox image */}
                    <img
                        src={state.getMainImage()}
                        alt="Product image fullscreen"
                        className="max-h-full max-w-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Next arrow */}
                    <Show when={state.hasThumbnails()}>
                        <button
                            type="button"
                            className="absolute right-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
                            onClick={(e) => { e.stopPropagation(); state.nextImage(); }}
                            aria-label="Next image"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
