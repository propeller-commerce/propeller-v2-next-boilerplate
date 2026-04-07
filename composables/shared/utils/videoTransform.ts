/**
 * videoTransform — YouTube / Vimeo embed URL normalisation.
 *
 * Used by ProductVideos component.
 * Framework-agnostic pure functions.
 */

/**
 * Returns true when the URI points to a YouTube or Vimeo video
 * that can be embedded via an <iframe>.
 */
export function isEmbeddable(uri: string): boolean {
  return (
    uri.includes('youtube.com') ||
    uri.includes('youtu.be') ||
    uri.includes('vimeo.com')
  );
}

/**
 * Normalises a YouTube or Vimeo watch URL to its corresponding embed URL.
 * For non-embeddable URIs the original string is returned unchanged.
 */
export function normalizeVideoUrl(uri: string): string {
  // YouTube watch URL → embed URL
  if (uri.includes('youtube.com/watch')) {
    try {
      const url = new URL(uri);
      const videoId = url.searchParams.get('v') || '';
      return `https://www.youtube.com/embed/${videoId}`;
    } catch {
      return uri;
    }
  }

  // YouTube short URL (youtu.be/VIDEO_ID)
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
