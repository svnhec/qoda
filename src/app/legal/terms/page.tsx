"use client"

export default function TermsPage() {
  return (
    <div className="glass-card p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8 pb-8 border-b border-border">
        <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Protocol Document</p>
        <h1 className="text-3xl font-bold mb-2 font-mono">PROTOCOL: TERMS_OF_SERVICE_V1</h1>
        <p className="text-xs text-muted-foreground font-mono">TIMESTAMP: 2026-01-04 14:00:00 UTC</p>
      </div>

      {/* Content */}
      <div className="prose prose-invert prose-sm max-w-none space-y-8">
        <section>
          <h2 className="text-lg font-bold font-mono text-primary">1.0 ACCEPTANCE_OF_TERMS</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using the Qoda Financial Operating System (&ldquo;Service&rdquo;), you agree to be bound by
            these Terms of Service (&ldquo;Terms&rdquo;). If you disagree with any part of these terms, you may not
            access the Service. These Terms apply to all users of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">2.0 SERVICE_DESCRIPTION</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">2.1 Platform Overview</h3>
              <p className="text-muted-foreground leading-relaxed">
                Qoda provides a financial management platform for AI Automation Agencies, including virtual card
                issuance, transaction monitoring, and client billing services powered by Stripe Connect infrastructure.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">2.1 Stripe Partnership</h3>
              <p className="text-muted-foreground leading-relaxed">
                Payment processing services are provided by Stripe, Inc. By using Qoda, you also agree to Stripe&apos;s
                Terms of Service and Connected Account Agreement.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">2.3 Service Availability</h3>
              <p className="text-muted-foreground leading-relaxed">
                We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. Scheduled maintenance
                windows will be communicated in advance via email and in-app notifications.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">3.0 USER_ACCOUNTS</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">3.1 Account Creation</h3>
              <p className="text-muted-foreground leading-relaxed">
                You must provide accurate, complete, and current information during the registration process. You are
                responsible for safeguarding your account credentials and for all activities under your account.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">3.2 Business Verification</h3>
              <p className="text-muted-foreground leading-relaxed">
                Qoda reserves the right to request business verification documents (KYB) as required by our payment
                partners. Failure to provide requested documentation may result in account limitations.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">4.0 PAYMENT_TERMS</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">4.1 Subscription Fees</h3>
              <p className="text-muted-foreground leading-relaxed">
                Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except
                where required by law.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold font-mono text-foreground">4.2 Transaction Fees</h3>
              <p className="text-muted-foreground leading-relaxed">
                Transaction fees vary by subscription tier and are charged per transaction processed through issued
                cards. Current fee schedules are available on our Pricing page.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">5.0 LIMITATION_OF_LIABILITY</h2>
          <p className="text-muted-foreground leading-relaxed">
            In no event shall Qoda, its directors, employees, partners, agents, suppliers, or affiliates be liable for
            any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">6.0 TERMINATION</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may terminate or suspend your account immediately, without prior notice, for conduct that we believe
            violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">7.0 GOVERNING_LAW</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms shall be governed by the laws of the State of Delaware, United States, without regard to its
            conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold font-mono text-primary">8.0 CONTACT</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms, contact us at:{" "}
            <span className="text-primary font-mono">legal@qoda.finance</span>
          </p>
        </section>
      </div>
    </div>
  )
}