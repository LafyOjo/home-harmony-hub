import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const plans = [
  {
    name: "Basic",
    price: "Free",
    period: "",
    description: "For individual landlords getting started",
    badge: null,
    features: [
      "Up to 3 properties",
      "Tenant portal",
      "Rent collection via Stripe",
      "Basic maintenance requests",
      "Document storage (500 MB)",
      "Email notifications",
    ],
    cta: "Get Started Free",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "£12",
    period: "/unit/month",
    description: "For growing portfolios with advanced needs",
    badge: "Most Popular",
    features: [
      "Unlimited properties",
      "Everything in Basic",
      "Advanced accounting & reports",
      "Tenant screening integration",
      "Contract e-signatures",
      "Maintenance worker management",
      "Financial PDF/CSV exports",
      "Property policies & compliance",
      "Priority support",
    ],
    cta: "Start Free Trial",
    variant: "default" as const,
  },
  {
    name: "Premium",
    price: "£25",
    period: "/unit/month",
    description: "For agencies and large portfolios",
    badge: "Enterprise",
    features: [
      "Everything in Pro",
      "Multi-user team access",
      "API access & webhooks",
      "Custom branding",
      "Dedicated account manager",
      "Advanced analytics dashboard",
      "GDPR compliance tools",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    variant: "outline" as const,
  },
];

export default function Pricing() {
  const { t } = useTranslation();
  const appName = t("common.appName", "TenantVault");

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="font-display text-xl font-bold text-primary">{appName}</Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
            <Link to="/auth/login"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/auth/register"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Simple, transparent <span className="text-primary">pricing</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Start free, upgrade as you grow. No hidden fees, no long-term contracts.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`relative p-6 h-full flex flex-col ${plan.badge === "Most Popular" ? "border-primary shadow-lg ring-1 ring-primary/20" : ""}`}>
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3">
                    {plan.badge === "Most Popular" && <Sparkles className="w-3 h-3 mr-1" />}
                    {plan.badge}
                  </Badge>
                )}

                <div className="mb-6">
                  <h3 className="font-display text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/auth/register" className="mt-auto">
                  <Button variant={plan.variant} className="w-full gap-2">
                    {plan.cta} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FAQ / Trust section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 max-w-2xl mx-auto text-center"
        >
          <h2 className="font-display text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4 text-left">
            {[
              { q: "Can I try Pro features for free?", a: "Yes! All new accounts get a 14-day free trial of Pro features. No credit card required." },
              { q: "Can I change plans at any time?", a: "Absolutely. Upgrade, downgrade, or cancel at any time. Changes take effect at the start of your next billing cycle." },
              { q: "Is my data secure?", a: "Yes. All data is encrypted at rest and in transit. Documents are stored in private encrypted storage. We are GDPR compliant." },
              { q: "Do tenants need to pay?", a: "No. Tenant accounts are always free. Only landlords and agents choose a pricing plan." },
            ].map(faq => (
              <Card key={faq.q} className="p-4">
                <p className="font-semibold text-sm mb-1">{faq.q}</p>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground underline mr-4">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-foreground underline">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
