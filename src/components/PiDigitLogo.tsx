import { Cpu } from 'lucide-react';

export function PiDigitLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-gradient-to-br from-rose-600 via-rose-700 to-slate-900 border border-rose-500/40 flex items-center justify-center text-white shadow-md shadow-rose-950/50 ${className}`}
    >
      <Cpu className="w-5 h-5 text-rose-100" />
    </div>
  );
}
