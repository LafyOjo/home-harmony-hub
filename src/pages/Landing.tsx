import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, FileText, Home, ArrowRight, CheckCircle2 } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Landing() {
  const { t } = useTranslation();

  const features = [
    { icon: Shield, titleKey: "landing.features.security.title", descKey: "landing.features.security.desc" },
    { icon: FileText, titleKey: "landing.features.tenantPack.title", descKey: "landing.features.tenantPack.desc" },
    { icon: Home, titleKey: "landing.features.pipeline.title", descKey: "landing.features.pipeline.desc" },
  ];

  const steps = [
    t("landing.steps.1"),
    t("landing.steps.2"),
    t("landing.steps.3"),
    t("landing.steps.4"),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md"
      >
        {t("common.skipToContent")}
      </a>

      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50" aria-label={t("a11y.mainNavigation")}>
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="font-display text-xl font-bold text-primary" aria-label={t("common.appName")}>
            {t("common.appName")}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">{t("common.logIn")}</Button>
            </Link>
            <Link to="/auth/register">
              <Button size="sm">{t("common.getStarted")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main id="main-content">
        <section className="container mx-auto px-4 pt-20 pb-24" aria-labelledby="hero-heading">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1
              id="hero-heading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight"
            >
              {t("landing.heroTitle")}{" "}
              <span className="text-primary">{t("landing.heroHighlight")}</span>{" "}
              {t("landing.heroEnd")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              {t("landing.heroDesc")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/auth/register?role=tenant">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  {t("landing.imTenant")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/auth/register?role=landlord">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                  {t("landing.imLandlord")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-secondary/50 py-20" aria-labelledby="features-heading">
          <div className="container mx-auto px-4">
            <h2 id="features-heading" className="font-display text-3xl font-bold text-center mb-12">{t("landing.whyTitle")}</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {features.map((f, i) => (
                <motion.article
                  key={f.titleKey}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-card rounded-xl p-6 shadow-sm border border-border"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4" aria-hidden="true">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">{t(f.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm">{t(f.descKey)}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-20" aria-labelledby="steps-heading">
          <div className="container mx-auto px-4 max-w-2xl">
            <h2 id="steps-heading" className="font-display text-3xl font-bold text-center mb-12">{t("landing.howItWorks")}</h2>
            <ol className="space-y-4" role="list">
              {steps.map((step, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-4 bg-card rounded-lg p-4 border border-border"
                >
                  <div
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0"
                    aria-label={t("a11y.stepNumber", { number: i + 1 })}
                  >
                    {i + 1}
                  </div>
                  <span className="text-foreground">{step}</span>
                  <CheckCircle2 className="w-5 h-5 text-success ms-auto shrink-0" aria-label={t("a11y.completedStep")} />
                </motion.li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8" role="contentinfo">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          {t("landing.footer")}
        </div>
      </footer>
    </div>
  );
}
