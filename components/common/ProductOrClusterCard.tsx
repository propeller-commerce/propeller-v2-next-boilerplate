'use client';

import { Product, Cluster, Enums, IBaseProduct } from 'propeller-sdk-v2';
import ClusterCard from '@/output/react/ui-components/ClusterCard';
import ProductCard from '@/output/react/ui-components/ProductCard';
import { graphqlClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { config } from '@/data/config';
import { useCart } from '@/context/CartContext';

interface ProductOrClusterCardProps {
  item: Product | Cluster;
}

export default function ProductOrClusterCard({ item }: ProductOrClusterCardProps) {
  const { state } = useAuth();
  const router = useRouter();
  const { cart, addToCart, saveCart } = useCart();
  // Check if it's a cluster or product
  const isCluster = (item as IBaseProduct).class === Enums.ProductClass.CLUSTER || (item as Cluster).clusterId;

  if (isCluster) {
    return <ClusterCard cluster={item as Cluster} configuration={config} />;
  }

  return <ProductCard
    product={item as Product}
    graphqlClient={graphqlClient}
    user={state.user}
    configuration={config}
    showModal={true}
    cartId={cart?.cartId}
    afterAddToCart={(cart, item) => {
      saveCart(cart);
      console.log('Cart updated:', cart);
      console.log('Added item:', item);
    }}
    onProceedToCheckout={() => router.push('/checkout')}
  />;
}
