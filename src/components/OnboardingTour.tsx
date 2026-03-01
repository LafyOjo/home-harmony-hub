import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Home, FileText, PoundSterling, Wrench, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

const ONBOARDING_KEY = "onboarding_completed";

interface Step {
  title: string;
  description: string;
  icon: React.ElementType;
  action?: string;
  link?: string;
}

export default function OnboardingTour() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const key = `${ONBOARDING_KEY}_${user.id}`;
    if (!localStorage.getItem(key)) {
      // Delay showing to let dashboard render first
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const tenantSteps: Step[] = [
    {
      title: t("onboarding.welcome", "Welcome to TenantVault! 👋"),
      description: t("onboarding.welcomeDesc", "Let's take a quick tour of your dashboard. We'll show you the key features to help you manage your tenancy."),
      icon: Home,
    },
    {
      title: t("onboarding.profile", "Complete Your Profile"),
      description: t("onboarding.profileDesc", "Add your personal details, address history, and employment information. A complete profile makes applications faster."),
      icon: Shield,
      link: "/dashboard/profile",
    },
    {
      title: t("onboarding.documents", "Upload Documents"),
      description: t("onboarding.documentsDesc", "Upload your ID, proof of address, and other documents. These are stored securely and can be shared with landlords."),
      icon: FileText,
      link: "/dashboard/documents",
    },
    {
      title: t("onboarding.tenancy", "Manage Your Tenancy"),
      description: t("onboarding.tenancyDesc", "Once you have an active tenancy, you can view contracts, pay rent, submit maintenance requests, and communicate with your landlord — all from your dashboard."),
      icon: PoundSterling,
    },
    {
      title: t("onboarding.privacy", "Your Data, Your Control"),
      description: t("onboarding.privacyDesc", "Visit Privacy & Data settings anytime to export your data, manage cookie preferences, or request account deletion. We're GDPR compliant."),
      icon: Shield,
      link: "/dashboard/privacy",
    },
  ];

  const landlordSteps: Step[] = [
    {
      title: t("onboarding.welcome", "Welcome to TenantVault! 👋"),
      description: t("onboarding.landlordWelcomeDesc", "Let's walk you through the key features for managing your properties and tenants."),
      icon: Home,
    },
    {
      title: t("onboarding.listings", "Create Your First Listing"),
      description: t("onboarding.listingsDesc", "Add your properties with photos, details, and rent amounts. Then generate apply links to share with prospective tenants."),
      icon: Home,
      link: "/dashboard/listings/new",
    },
    {
      title: t("onboarding.pipeline", "Review Applications"),
      description: t("onboarding.pipelineDesc", "Track applications through your pipeline — from submitted to shortlisted to offered. Run tenant screening and check references."),
      icon: FileText,
      link: "/dashboard/pipeline",
    },
    {
      title: t("onboarding.accounting", "Track Finances"),
      description: t("onboarding.accountingDesc", "View rent payments, generate financial reports, and export data for your accountant. Late fees are calculated automatically."),
      icon: PoundSterling,
      link: "/dashboard/accounting",
    },
    {
      title: t("onboarding.maintenance", "Maintenance & Workers"),
      description: t("onboarding.maintenanceDesc", "Tenants can submit maintenance requests with photos. Assign workers, schedule repairs, and track progress."),
      icon: Wrench,
      link: "/dashboard/landlord-maintenance",
    },
  ];

  const steps = role === "landlord" || role === "agent" ? landlordSteps : tenantSteps;

  const dismiss = () => {
    if (!user) return;
    localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
    setVisible(false);
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const currentStep = steps[step];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="bg-card border border-border rounded-xl p-6 max-w-md mx-4 shadow-xl"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <currentStep.icon className="w-5 h-5 text-primary" />
            </div>
            <Button variant="ghost" size="icon" onClick={dismiss} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <h3 className="font-display text-lg font-bold mb-2">{currentStep.title}</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{currentStep.description}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mb-5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-muted-foreground">
              {t("onboarding.skip", "Skip tour")}
            </Button>
            <Button size="sm" onClick={next} className="gap-1">
              {step < steps.length - 1
                ? t("onboarding.next", "Next")
                : t("onboarding.finish", "Get Started")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
