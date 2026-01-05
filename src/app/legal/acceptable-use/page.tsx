"use client"

import { X, AlertTriangle } from "lucide-react"

const blockedCategories = [
  { name: "Adult Content", mcc: "5967" },
  { name: "Gambling", mcc: "7995" },
  { name: "Cryptocurrency", mcc: "6051" },
  { name: "Weapons & Firearms", mcc: "5941" },
  { name: "Tobacco Products", mcc: "5993" },
  { name: "Drug Paraphernalia", mcc: "5999" },
  { name: "Money Orders", mcc: "6051" },
  { name: "Wire Transfers", mcc: "4829" },
]

export default function AcceptableUsePage() {
  return (
    <div className="glass-card p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8 pb-8 border-b border-border">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Protocol Document</p>
        <h1 className="text-3xl font-bold mb-2 font-mono">PROTOCOL: ACCEPTABLE_USE_POLICY_V1</h1>
        <p className="text-xs text-muted-foreground font-mono">TIMESTAMP: 2026-01-04 14:00:00 UTC</p>
      </div>

      {/* Content */}
      <div className="prose prose-invert prose-sm max-w-none space-y-8">
        <section>
          <h2 className="text-lg font-bold font-mono text-primary">1.0 OVERVIEW</h2>
          <p className="text-muted-foreground leading-relaxed">
            This Acceptable Use Policy (&ldquo;AUP&rdquo;) governs the use of virtual cards issued through the Qoda
            platform. All AI agents and human users must comply with these rules. Violations may result in immediate
            card termination and account suspension.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">2.0 AI_AGENT_REQUIREMENTS</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">2.1 Authorized Use</h3>
              <p className="text-muted-foreground leading-relaxed">
                AI agents may only use issued cards for business purposes directly related to their assigned tasks. Each
                transaction must be traceable to a legitimate business need.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">2.2 Velocity Limits</h3>
              <p className="text-muted-foreground leading-relaxed">
                Agents must operate within configured velocity limits. Attempts to circumvent spend controls through
                transaction splitting or multiple cards are strictly prohibited.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">2.3 Human Oversight</h3>
              <p className="text-muted-foreground leading-relaxed">
                Organizations must maintain meaningful human oversight of all AI agent spending. This includes regular
                review of transaction logs and prompt response to alerts.
              </p>
            </div>
          </div>
        </section>

        {/* Warning Box */}
        <section>
          <h2 className="text-lg font-bold font-mono text-primary">3.0 RESTRICTED_AI_SPEND</h2>

          <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-6 mt-4 glow-red">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-500 font-bold font-mono text-sm">SYSTEM ALERT: PROHIBITED CATEGORIES</span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              The following merchant categories are blocked at the network level. Attempted transactions will be
              automatically declined and flagged for review.
            </p>

            {/* Blocked Categories Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {blockedCategories.map((category) => (
                <div
                  key={category.mcc}
                  className="bg-background/50 border border-red-500/20 rounded-lg p-3 flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <X className="w-3 h-3 text-red-500" />
                    <span className="text-xs font-bold text-red-400">BLOCKED</span>
                  </div>
                  <span className="text-xs text-foreground font-medium">{category.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">MCC: {category.mcc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">4.0 PROHIBITED_ACTIVITIES</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            The following activities are explicitly prohibited:
          </p>
          <ul className="list-none space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span>Using cards for personal expenses or non-business purchases</span>
            </li>
            <li className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span>Sharing card details with unauthorized third parties</span>
            </li>
            <li className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span>Attempting to bypass merchant category restrictions</span>
            </li>
            <li className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span>Making purchases that violate applicable laws or regulations</span>
            </li>
            <li className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span>Engaging in money laundering or fraudulent activities</span>
            </li>
            <li className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span>Using multiple agents to circumvent individual spend limits</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">5.0 MONITORING_AND_ENFORCEMENT</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">5.1 Transaction Monitoring</h3>
              <p className="text-muted-foreground leading-relaxed">
                All transactions are monitored in real-time for policy violations. Suspicious activity triggers
                automatic alerts and may result in temporary card freezes pending review.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">5.2 Violation Consequences</h3>
              <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground">
                        Severity
                      </th>
                      <th className="text-left py-2 text-xs uppercase tracking-wider text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-2 font-mono text-yellow-500">LEVEL_1</td>
                      <td className="py-2">Warning notification + transaction review</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 font-mono text-orange-500">LEVEL_2</td>
                      <td className="py-2">Temporary card freeze (24-72 hours)</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-mono text-red-500">LEVEL_3</td>
                      <td className="py-2">Permanent termination + account review</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">6.0 REPORTING_VIOLATIONS</h2>
          <p className="text-muted-foreground leading-relaxed">
            To report suspected policy violations:{" "}
            <span className="text-primary font-mono">compliance@qoda.finance</span>
          </p>
        </section>
      </div>
    </div>
  )
}