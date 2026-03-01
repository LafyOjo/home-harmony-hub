import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

const CONSENT_KEY = "cookie_consent";

type ConsentChoice = "all" | "essential" | null;

export default function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = (choice: "all" | "essential") => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, timestamp: new Date().toISOString() }));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 inset-x-0 z-50 p-4"
        >
          <div className="max-w-3xl mx-auto bg-card border border-border rounded-xl p-5 shadow-lg">
            <p className="text-sm text-foreground mb-1 font-semibold">
              {t("cookie.title", "We use cookies")}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t(
                "cookie.description",
                "We use essential cookies for authentication and preferences. Analytics cookies help us improve the platform. You can choose which cookies to accept."
              )}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Button size="sm" onClick={() => accept("all")}>
                {t("cookie.acceptAll", "Accept All")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => accept("essential")}>
                {t("cookie.essentialOnly", "Essential Only")}
              </Button>
              <a
                href="/privacy"
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                {t("cookie.learnMore", "Learn more")}
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
