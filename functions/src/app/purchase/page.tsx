import { Suspense } from 'react';
import PurchaseClient from './PurchaseClient';

export default function PurchasePage() {
  return (
    <Suspense fallback={null}>
      <PurchaseClient />
    </Suspense>
  );
}
