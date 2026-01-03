/**
 * SYSTEM STATUS COMPONENT
 * =============================================================================
 * Pulsing green dot with "All Systems Operational" label.
 *
 * Features:
 * - Animated pulsing green dot
 * - Box-shadow glow effect
 * - Clean, minimal design
 * =============================================================================
 */

export function SystemStatus() {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        {/* Pulsing green dot with glow effect */}
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
          {/* Glow effect */}
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 blur-sm opacity-50" />
        </div>

        {/* Status text */}
        <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
          All Systems Operational
        </span>
      </div>
    </div>
  );
}