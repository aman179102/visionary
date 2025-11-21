import { Cpu } from 'lucide-react';
import { Nav } from './nav';

export function Header() {
  return (
    <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
        <div className="flex items-center">
          <Cpu className="h-8 w-8 text-primary" />
          <h1 className="ml-3 text-2xl font-semibold tracking-tight text-foreground">
            Visionary
          </h1>
        </div>
        <Nav />
      </div>
    </header>
  );
}
