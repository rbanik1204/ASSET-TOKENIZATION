import { MainLayout } from '@/components/layout/MainLayout';

export default function FaqPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">FAQ</h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Placeholder page. Add common questions and answers here.
        </p>
      </div>
    </MainLayout>
  );
}
