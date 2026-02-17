import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, FileText, Home, ArrowRight, CheckCircle2 } from "lucide-react";

const features = [
  { icon: Shield, title: "Bank-Level Security", desc: "Documents stored with encryption, signed URLs, and strict access controls." },
  { icon: FileText, title: "Tenant Pack", desc: "Generate a professional PDF pack with profile, references, and documents." },
  { icon: Home, title: "Smart Pipeline", desc: "Landlords track applicants through a Kanban-style pipeline with affordability checks." },
];

const steps = [
  "Create your profile & upload documents",
  "Request employer & landlord references",
  "Generate your Tenant Pack",
  "Apply to listings with one tap",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="font-display text-xl font-bold text-primary">
            TenantVault
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/auth/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-20 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight"
          >
            Renting made{" "}
            <span className="text-primary">simple, secure</span>{" "}
            & trackable
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Replace messy paperwork with a structured, digital tenancy workflow.
            Build your profile, upload documents, generate your Tenant Pack, and apply — all in one place.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/auth/register?role=tenant">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                I'm a Tenant <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/auth/register?role=landlord">
              <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                I'm a Landlord <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-secondary/50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-12">Why TenantVault?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl p-6 shadow-sm border border-border"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">How it works for tenants</h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 bg-card rounded-lg p-4 border border-border"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <span className="text-foreground">{step}</span>
                <CheckCircle2 className="w-5 h-5 text-success ml-auto shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 TenantVault. Built for UK renters and landlords.
        </div>
      </footer>
    </div>
  );
}
