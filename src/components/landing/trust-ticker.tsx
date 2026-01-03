'use client';

const LOGOS = [
  { name: 'OpenAI', weight: 'font-semibold' },
  { name: 'STRIPE', weight: 'font-bold' },
  { name: 'ANTHROPIC', weight: 'font-medium' },
  { name: '▲ Vercel', weight: 'font-bold' },
  { name: 'Y Combinator', weight: 'font-bold' },
  { name: 'supa base', weight: 'font-bold' },
  { name: 'Resend', weight: 'font-medium' },
];

export function TrustTicker() {
  return (
    <div className="w-full py-12 border-y border-white/5 bg-[#050505] relative overflow-hidden flex items-center">

      {/* Gradient Masks */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#050505] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#050505] to-transparent z-10" />

      {/* Scrolling Track */}
      <div className="flex gap-20 animate-scroll whitespace-nowrap opacity-50 hover:opacity-100 transition-opacity duration-500">
        {/* Double the list for seamless loop */}
        {[...LOGOS, ...LOGOS, ...LOGOS].map((logo, i) => (
          <div
            key={i}
            className={`text-2xl text-white/50 hover:text-white transition-colors cursor-default select-none grayscale hover:grayscale-0 ${logo.weight}`}
          >
            {logo.name}
          </div>
        ))}
      </div>

      <style jsx>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.33%); }
                }
                .animate-scroll {
                    animation: scroll 40s linear infinite;
                }
                .animate-scroll:hover {
                    animation-play-state: paused;
                }
            `}</style>
    </div>
  );
}