import React from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="border-4 border-destructive bg-black p-12 text-center max-w-2xl">
        <AlertTriangle className="w-24 h-24 mx-auto mb-6 text-destructive" />
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-bold uppercase mb-4">ROUTE NOT FOUND</h2>
        <p className="text-muted-foreground mb-8">
          The requested endpoint does not exist in the system registry
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black border-4 border-foreground font-bold uppercase hover:bg-accent/80 transition-colors"
        >
          <Home className="w-5 h-5" />
          RETURN TO DASHBOARD
        </Link>
      </div>
    </div>
  );
};
