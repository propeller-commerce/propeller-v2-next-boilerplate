'use client';

import { Product, Cluster, Enums } from 'propeller-sdk-v2';
import ProductCard from './ProductCard';
import ClusterCard from './ClusterCard';

interface ProductOrClusterCardProps {
  item: Product | Cluster;
}

export default function ProductOrClusterCard({ item }: ProductOrClusterCardProps) {
  // Check if it's a cluster or product
  const isCluster = (item as any).class === Enums.ProductClass.CLUSTER || (item as any).clusterId;

  if (isCluster) {
    return <ClusterCard cluster={item as Cluster} />;
  }

  return <ProductCard product={item as Product} />;
}
