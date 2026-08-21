import { notFound } from 'next/navigation';
import TrackerShell from '@/components/tracker/TrackerShell';
import { SECTIONS, type SectionId } from '@/components/tracker/config';

/**
 * Server shell → client island, matching the pattern every other route here
 * uses. The shell only validates the section name; all data is fetched
 * client-side so the numbers stay live rather than being baked into a render.
 */
export function generateStaticParams() {
  return SECTIONS.map((s) => ({ section: s.id }));
}

export default async function TrackerSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!SECTIONS.some((s) => s.id === section)) notFound();
  return <TrackerShell section={section as SectionId} />;
}
