import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function TermsOfService() {
  const { t } = useTranslation();
  const appName = t("common.appName", "TenantVault");
  const lastUpdated = "1 March 2026";

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="font-display text-xl font-bold text-primary">{appName}</Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="font-display text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: {lastUpdated}</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using {appName} ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, you must not use the Platform. These terms apply to all users including tenants, landlords, agents, and administrators.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              {appName} is a property management platform that facilitates communication and transactions between landlords and tenants. Services include tenant profile management, document storage, rent collection, maintenance request tracking, contract management, and financial reporting. The Platform acts as a facilitator and is not a party to any tenancy agreement.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You must be at least 18 years old to use the Platform. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. Payments & Fees</h2>
            <p className="text-muted-foreground leading-relaxed">
              Rent payments processed through the Platform are handled by Stripe, our third-party payment processor. We are not responsible for payment processing errors, delays, or failures caused by third-party services. Late fees may be automatically calculated in accordance with the terms of your tenancy agreement. All amounts are displayed in the currency specified by your landlord.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users must not: (a) use the Platform for any unlawful purpose; (b) upload false, misleading, or fraudulent information; (c) attempt to gain unauthorized access to other accounts or systems; (d) interfere with the Platform's operation; (e) use automated systems to scrape or extract data. Landlords are responsible for compliance with applicable landlord-tenant legislation in their jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, trademarks, and technology on the Platform are owned by {appName} or its licensors. Users retain ownership of content they upload but grant {appName} a non-exclusive licence to store, process, and display such content for the purpose of providing the service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, {appName} shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. Our total liability shall not exceed the amount you have paid to us in the twelve months preceding the claim. Nothing in these terms limits liability for death, personal injury caused by negligence, or fraud.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account at any time for violation of these terms. You may delete your account at any time through the Privacy & Data settings. Upon termination, your right to use the Platform ceases immediately. Data retention following termination is governed by our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">9. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales. We encourage users to contact us first to resolve disputes informally before pursuing legal action.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. Material changes will be notified via email or in-app notification. Continued use of the Platform after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, contact us at <a href="mailto:legal@tenantvault.com" className="text-primary hover:underline">legal@tenantvault.com</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground underline mr-4">Privacy Policy</Link>
          <Link to="/pricing" className="hover:text-foreground underline">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}
