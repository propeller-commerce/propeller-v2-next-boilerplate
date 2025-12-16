'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Cluster } from 'propeller-sdk-v2';

interface ClusterCardProps {
  cluster: Cluster;
}

export default function ClusterCard({ cluster }: ClusterCardProps) {
  // For clusters, use defaultProduct for display
  const defaultProduct = cluster.defaultProduct;

  const imageUrl =
    defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url ||
    'https://playground2.dev.wp-propel.com/wp-content/plugins/propeller-ecommerce-v2/public/assets/img/no-image-card.webp';

  const name = defaultProduct?.names?.[0]?.value || cluster.names?.[0]?.value || 'Cluster';
  const sku = cluster.sku || defaultProduct?.sku || '';
  const price = defaultProduct?.price?.gross || 0;
  const clusterId = cluster.clusterId;
  const slug = cluster.slugs?.[0]?.value || defaultProduct?.slugs?.[0]?.value || '';

  return (
    <Link
      href={`/cluster/${clusterId}/${slug}`}
      className="w-full flex flex-col h-full bg-white rounded-lg shadow hover:shadow-lg transition p-4"
    >
      <div className="relative w-full h-48 mb-4 flex-shrink-0">
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain"
        />
      </div>
      <h3 className="font-semibold text-lg mb-1 line-clamp-2 min-h-[3.5rem]">{name}</h3>
      <p className="text-sm text-gray-500 mb-2">{sku}</p>
      <p className="text-xl font-bold text-blue-600 mb-4">€{price.toFixed(2)}</p>

      <div className="w-full mt-auto">
        <button
          className="w-full bg-violet-500 text-white py-2 rounded hover:bg-violet-600 transition font-semibold"
          onClick={(e) => {
            e.preventDefault();
            // Navigate to cluster page (handled by Link)
          }}
        >
          View Cluster
        </button>
      </div>
    </Link>
  );
}
