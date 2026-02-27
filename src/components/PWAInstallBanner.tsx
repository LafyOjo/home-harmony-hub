import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Download, X, WifiOff } from "lucide-react";
import { useState } from "react";

export function PWAInstallBanner() {
  const { canInstall, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install TenantVault</p>
          <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for quick access &amp; offline use.</p>
          <Button size="sm" className="mt-2 h-8 text-xs" onClick={install}>
            Install App
          </Button>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function OfflineBanner() {
  const { isOnline } = usePWA();
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-destructive text-destructive-foreground text-center text-xs py-1.5 font-medium flex items-center justify-center gap-1.5">
      <WifiOff className="h-3.5 w-3.5" />
      You're offline — some features may be limited
    </div>
  );
}
