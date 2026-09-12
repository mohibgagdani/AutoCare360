import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui';
import { VehicleArt } from '@/components/vehicles/VehicleArt';
import { useDocumentTitle } from '@/hooks/common';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="w-64 opacity-90">
        <VehicleArt illustration="hatchback" color="#3b6af5" />
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-brand-600">404 · Wrong turn</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">This road doesn’t exist</h1>
      <p className="mt-2 max-w-md text-sm text-ink-3">The page you’re looking for has moved or never existed. Let’s get you back on track.</p>
      <div className="mt-6 flex gap-2">
        <Button variant="secondary" leftIcon={ArrowLeft} onClick={() => window.history.back()}>
          Go back
        </Button>
        <Button to="/app" leftIcon={Compass}>
          Dashboard
        </Button>
      </div>
    </div>
  );
}
