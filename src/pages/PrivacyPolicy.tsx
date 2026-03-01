import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function PrivacyPolicy() {
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
        <h1 className="font-display text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: {lastUpdated}</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3">1. Data Controller</h2>
            <p className="text-muted-foreground leading-relaxed">
              {appName} is the data controller for personal data processed through the Platform. For data protection inquiries, contact our Data Protection Officer at <a href="mailto:dpo@tenantvault.com" className="text-primary hover:underline">dpo@tenantvault.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">2. Data We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We collect the following categories of personal data:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Identity data:</strong> Full name, date of birth, profile photo</li>
              <li><strong className="text-foreground">Contact data:</strong> Email address, phone number, postal addresses</li>
              <li><strong className="text-foreground">Financial data:</strong> Employment details, income, rent payment history</li>
              <li><strong className="text-foreground">Documents:</strong> ID documents, proof of address, employment references</li>
              <li><strong className="text-foreground">Usage data:</strong> Login times, pages visited, features used</li>
              <li><strong className="text-foreground">Technical data:</strong> IP address, browser type, device information</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">3. Legal Basis for Processing (GDPR Art. 6)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We process your data under the following lawful bases:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Contract performance:</strong> To provide the Platform services you have signed up for</li>
              <li><strong className="text-foreground">Legitimate interests:</strong> To improve our services, prevent fraud, and ensure security</li>
              <li><strong className="text-foreground">Consent:</strong> For analytics cookies and optional marketing communications</li>
              <li><strong className="text-foreground">Legal obligation:</strong> To comply with tax, anti-money laundering, and tenancy laws</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">4. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your data to: operate and maintain your account; process rent payments; facilitate communication between landlords and tenants; conduct tenant screening and reference checks; generate financial reports; send notifications about your tenancy; comply with legal obligations; and improve the Platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We share data only with:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Your landlord/tenant:</strong> As necessary for the tenancy relationship</li>
              <li><strong className="text-foreground">Payment processors:</strong> Stripe, for processing rent payments</li>
              <li><strong className="text-foreground">Screening providers:</strong> For tenant background and reference checks</li>
              <li><strong className="text-foreground">Legal authorities:</strong> When required by law or court order</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell your personal data to third parties. All data processors are bound by data processing agreements.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">6. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. Analytics cookies are only used with your consent and can be managed through the cookie consent banner or your Privacy & Data settings. For more information, see our cookie preferences in your dashboard.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">7. Your Rights (GDPR Articles 15–22)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Under the GDPR, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Access</strong> your personal data (Art. 15)</li>
              <li><strong className="text-foreground">Rectification</strong> of inaccurate data (Art. 16)</li>
              <li><strong className="text-foreground">Erasure</strong> ("right to be forgotten") (Art. 17)</li>
              <li><strong className="text-foreground">Restrict processing</strong> (Art. 18)</li>
              <li><strong className="text-foreground">Data portability</strong> — export your data in machine-readable format (Art. 20)</li>
              <li><strong className="text-foreground">Object</strong> to processing based on legitimate interests (Art. 21)</li>
              <li><strong className="text-foreground">Withdraw consent</strong> at any time (Art. 7)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You can exercise these rights through your <strong className="text-foreground">Privacy & Data</strong> settings in the dashboard, or by contacting our DPO.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain personal data for as long as your account is active, plus 6 years after account closure (in accordance with UK tax and Companies Act requirements). Financial transaction records are retained for 7 years. You may request earlier deletion subject to legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">9. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is primarily stored in the European Economic Area. Where data is transferred outside the EEA, we ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the European Commission.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">10. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organisational measures to protect your data, including encryption at rest and in transit, access controls, audit logging, and regular security assessments. Documents are stored in private encrypted storage accessible only via secure signed URLs.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">11. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">12. Complaints</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you believe your data protection rights have been infringed, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ico.org.uk</a> or your local supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">13. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Data Protection Officer: <a href="mailto:dpo@tenantvault.com" className="text-primary hover:underline">dpo@tenantvault.com</a><br />
              General inquiries: <a href="mailto:support@tenantvault.com" className="text-primary hover:underline">support@tenantvault.com</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground underline mr-4">Terms of Service</Link>
          <Link to="/pricing" className="hover:text-foreground underline">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}
