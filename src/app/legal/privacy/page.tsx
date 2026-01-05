"use client"

export default function PrivacyPage() {
  return (
    <div className="glass-card p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8 pb-8 border-b border-border">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Protocol Document</p>
        <h1 className="text-3xl font-bold mb-2 font-mono">PROTOCOL: PRIVACY_POLICY_V1</h1>
        <p className="text-xs text-muted-foreground font-mono">TIMESTAMP: 2026-01-04 14:00:00 UTC</p>
      </div>

      {/* Content */}
      <div className="prose prose-invert prose-sm max-w-none space-y-8">
        <section>
          <h2 className="text-lg font-bold font-mono text-primary">1.0 DATA_COLLECTION</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">1.1 Information You Provide</h3>
              <ul className="list-none space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-mono text-xs">→</span>
                  Account information (name, email, business details)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-mono text-xs">→</span>
                  Payment information (processed securely via Stripe)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-mono text-xs">→</span>
                  Client and agent configuration data
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-mono text-xs">→</span>
                  Communication preferences
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">1.2 Automatically Collected</h3>
              <ul className="list-none space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-mono text-xs">→</span>
                  Transaction logs and metadata
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-mono text-xs">→</span>
                  Device and browser information
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-mono text-xs">→</span>
                  IP addresses and approximate location
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-mono text-xs">→</span>
                  Usage patterns and analytics
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">2.0 DATA_USAGE</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">We use collected information to:</p>
          <ul className="list-none space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">01</span>
              Provide, maintain, and improve the Service
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">02</span>
              Process transactions and send related information
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">03</span>
              Send technical notices, updates, and security alerts
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">04</span>
              Respond to your comments, questions, and requests
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">05</span>
              Monitor and analyze trends, usage, and activities
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">06</span>
              Detect, investigate, and prevent fraudulent transactions
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">3.0 DATA_SHARING</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">3.1 Third-Party Services</h3>
              <p className="text-muted-foreground leading-relaxed">
                We share data with Stripe for payment processing, and with analytics providers to improve our Service.
                All third parties are contractually bound to protect your data.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">3.2 Legal Requirements</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may disclose information if required by law, subpoena, or other legal process, or if we believe
                disclosure is necessary to protect our rights or the safety of others.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">4.0 DATA_SECURITY</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement industry-standard security measures including:
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {[
              "AES-256 encryption at rest",
              "TLS 1.3 in transit",
              "SOC 2 Type II compliant",
              "Regular security audits",
            ].map((item) => (
              <div key={item} className="bg-muted/30 border border-border rounded-lg p-3">
                <p className="text-xs font-mono text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">5.0 YOUR_RIGHTS</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Depending on your location, you may have rights to:
          </p>
          <ul className="list-none space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">→</span>
              Access your personal data
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">→</span>
              Correct inaccurate data
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">→</span>
              Request deletion of your data
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">→</span>
              Export your data in a portable format
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-mono text-xs">→</span>
              Opt-out of marketing communications
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">6.0 DATA_RETENTION</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your data for as long as your account is active or as needed to provide services. Transaction
            records are retained for 7 years as required by financial regulations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">7.0 CONTACT</h2>
          <p className="text-muted-foreground leading-relaxed">
            For privacy-related inquiries: <span className="text-primary font-mono">privacy@qoda.finance</span>
          </p>
        </section>
      </div>
    </div>
  )
}