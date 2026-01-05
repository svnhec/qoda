/**
 * TRUST STACK COMPONENT
 * =============================================================================
 * Row of grayscale security logos (SOC2, GDPR, ISO 27001, PCI DSS).
 *
 * Features:
 * - Monochrome/grayscale security badges
 * - Clean row layout with proper spacing
 * - Hover effects for interactivity
 * =============================================================================
 */

export function TrustStack() {
  const trustItems = [
    {
      name: "SOC2",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "blue",
    },
    {
      name: "GDPR",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: "green",
    },
    {
      name: "ISO 27001",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "amber",
    },
    {
      name: "PCI DSS",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: "lime",
    },
  ];

  return (
    <div className="flex items-center justify-center gap-8 py-6">
      {trustItems.map((item) => (
        <div
          key={item.name}
          className="flex flex-col items-center gap-2 group cursor-default"
        >
          {/* Icon with subtle hover effect - Grayscale implementation */}
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300">
            {/* Clone element with grayscale classes */}
            <div className="text-white/40 group-hover:text-white/60 transition-colors duration-300">
              {item.icon}
            </div>
          </div>

          {/* Label */}
          <span className="text-xs text-white/40 font-medium group-hover:text-white/60 transition-colors duration-200">
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );
}


