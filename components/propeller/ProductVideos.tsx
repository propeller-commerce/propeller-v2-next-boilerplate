import * as React from 'react';
  import  { PaginatedMediaVideoResponse, MediaVideo, LocalizedVideo, LocalizedString } from 'propeller-sdk-v2';





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




  function ProductVideos(props:ProductVideosProps) {

  function hasItems(): ReturnType<ProductVideosState["hasItems"]>{
const v = props.videos as PaginatedMediaVideoResponse;
return !!v?.items && v.items.length > 0;
}


function getVideoItems(): ReturnType<ProductVideosState["getVideoItems"]>{
const v = props.videos as PaginatedMediaVideoResponse;
return v?.items || [];
}


function getVideoUri(video: MediaVideo): ReturnType<ProductVideosState["getVideoUri"]>{
const lang = props.language as string || 'NL';
const vids = video.videos || [];
const match = vids.find((v: LocalizedVideo) => v.language === lang);
return match?.uri || vids?.[0]?.uri || '';
}


function getVideoTitle(video: MediaVideo): ReturnType<ProductVideosState["getVideoTitle"]>{
const lang = props.language as string || 'NL';
const alts = video.alt || [];
const match = alts.find((a: LocalizedString) => a.language === lang);
return match?.value || alts?.[0]?.value || 'Video';
}


function isEmbeddable(uri: string): ReturnType<ProductVideosState["isEmbeddable"]>{
return uri.includes('youtube.com') || uri.includes('youtu.be') || uri.includes('vimeo.com');
}


function getEmbedUrl(uri: string): ReturnType<ProductVideosState["getEmbedUrl"]>{
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
}


function getLabel(key: string, fallback: string): ReturnType<ProductVideosState["getLabel"]>{
return (props.labels as Record<string, string>)?.[key] || fallback;
}











return (


  <div  className={`product-videos ${props.className as string || ''}`}>{hasItems() ? (
  <h3 className="text-base font-semibold text-foreground mb-3">{getLabel('title', 'Videos')}</h3>
) : null}{hasItems() ? (
  <div className="space-y-4">{getVideoItems()?.map((video, index) => (
  <div className="rounded-lg overflow-hidden border border-border bg-black"  key={index}>{!!getVideoUri(video) ? (
  <>{isEmbeddable(getVideoUri(video)) ? (
  <div className="relative w-full"  style={{
paddingBottom: '56.25%'
}}><iframe  loading="lazy"  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" className="absolute inset-0 w-full h-full"  src={getEmbedUrl(getVideoUri(video))}  title={getVideoTitle(video)}  allowFullScreen  /></div>
) : null}
{!isEmbeddable(getVideoUri(video)) ? (
  <video  preload="metadata" className="w-full"  controls><source  src={getVideoUri(video)}  /></video>
) : null}</>
) : null}</div>
))}</div>
) : null}{!hasItems() ? (
  <p className="text-sm text-muted-foreground">{getLabel('empty', 'No videos')}</p>
) : null}</div>


);
}




  export default ProductVideos;


