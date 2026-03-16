import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Home, MapPin, Bed, Bath, PoundSterling, Calendar, CheckCircle2,
  ArrowRight, FileText, ShieldCheck, CreditCard, Download, Users,
  Building2, Search, Eye, Wrench, BarChart3,
} from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";

// ─── Mock Data ────────────────────────────────────────────────
const DEMO_LISTINGS = [
  {
    id: "demo-1",
    title: "Modern 2 Bed Flat in Shoreditch",
    address: "Flat 12, 45 Hackney Road, Shoreditch",
    postcode: "E2 7NX",
    rent_pcm: 1850,
    deposit: 2135,
    bedrooms: 2,
    bathrooms: 1,
    property_type: "Flat/Apartment",
    furnished: "Furnished",
    epc_rating: "B",
    available_from: "2026-04-01",
    description: "Bright and spacious 2-bedroom flat with modern kitchen, balcony overlooking the park, and excellent transport links. 5-minute walk to Shoreditch High Street Overground.",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop",
  },
  {
    id: "demo-2",
    title: "Charming 3 Bed Terraced House",
    address: "28 Victoria Road, Clapham",
    postcode: "SW4 0AH",
    rent_pcm: 2400,
    deposit: 2769,
    bedrooms: 3,
    bathrooms: 2,
    property_type: "Terraced House",
    furnished: "Unfurnished",
    epc_rating: "C",
    available_from: "2026-04-15",
    description: "Family-friendly terraced house with private garden, two reception rooms, and a garage. Close to Clapham Common and Northern Line.",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop",
  },
  {
    id: "demo-3",
    title: "Studio Apartment in Canary Wharf",
    address: "Unit 8, Harbour Exchange, Canary Wharf",
    postcode: "E14 9GE",
    rent_pcm: 1350,
    deposit: 1558,
    bedrooms: 0,
    bathrooms: 1,
    property_type: "Studio",
    furnished: "Furnished",
    epc_rating: "A",
    available_from: "2026-03-20",
    description: "Luxury studio with floor-to-ceiling windows, 24-hour concierge, gym, and river views. Steps from Jubilee Line.",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop",
  },
];

const now = new Date();
const DEMO_PAYMENTS = Array.from({ length: 12 }, (_, i) => {
  const dueDate = subMonths(addMonths(now, -6), -i);
  const isPast = dueDate < now;
  const isOverdue = isPast && i === 5;
  return {
    id: `pay-${i}`,
    due_date: format(dueDate, "yyyy-MM-dd"),
    amount: 1850,
    status: isOverdue ? "overdue" : isPast ? "paid" : "upcoming",
    paid_date: isPast && !isOverdue ? format(dueDate, "yyyy-MM-dd") : null,
    paid_amount: isPast && !isOverdue ? 1850 : 0,
    late_fee: isOverdue ? 92.5 : 0,
    payment_method: isPast && !isOverdue ? "Stripe" : null,
  };
});

const DEMO_TENANT = {
  name: "Sarah Johnson",
  email: "sarah.johnson@email.com",
  employer: "Tech Solutions Ltd",
  job_title: "Senior Developer",
  annual_income: 65000,
  credit_score: 742,
  credit_status: "Excellent",
};

const PIPELINE_STAGES = [
  { stage: "Submitted", count: 8, color: "bg-muted" },
  { stage: "Under Review", count: 4, color: "bg-primary/20" },
  { stage: "Credit Check", count: 3, color: "bg-amber-500/20" },
  { stage: "Shortlisted", count: 2, color: "bg-success/20" },
  { stage: "Offered", count: 1, color: "bg-primary/30" },
  { stage: "Accepted", count: 1, color: "bg-success/30" },
];

// ─── Component ────────────────────────────────────────────────
export default function Demo() {
  const [selectedListing, setSelectedListing] = useState(DEMO_LISTINGS[0]);
  const [simStep, setSimStep] = useState(0);
  const [showPayment, setShowPayment] = useState(false);

  const totalPaid = DEMO_PAYMENTS.filter(p => p.status === "paid").reduce((s, p) => s + p.paid_amount, 0);
  const outstanding = DEMO_PAYMENTS.reduce((s, p) => s + p.amount, 0) - totalPaid;
  const monthsCanCover = Math.floor(65000 / 12 / 1850 * 0.35 * 12); // months at 35% threshold

  const SIM_STEPS = [
    { title: "Search & Discovery", desc: "Tenant finds property on the platform", icon: Search },
    { title: "Book Viewing", desc: "Schedule in-person or virtual viewing", icon: Calendar },
    { title: "Submit Application", desc: "Upload ID, payslips & consent to credit check", icon: FileText },
    { title: "Credit & Background Check", desc: "Automated screening via Goodlord", icon: ShieldCheck },
    { title: "Landlord Review", desc: "Landlord reviews application in pipeline", icon: Eye },
    { title: "Offer & Contract", desc: "E-sign tenancy agreement", icon: CheckCircle2 },
    { title: "Deposit Protection", desc: "Deposit registered with DPS scheme", icon: PoundSterling },
    { title: "Move In & Pay Rent", desc: "Monthly rent via Stripe, track payments", icon: Home },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold text-primary">TenantVault</Link>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-xs">DEMO MODE</Badge>
            <Link to="/auth/register"><Button size="sm">Create Account</Button></Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Title */}
        <div className="text-center">
          <Badge className="bg-primary/10 text-primary mb-4">Interactive Demo</Badge>
          <h1 className="font-display text-3xl md:text-4xl font-bold">See How TenantVault Works</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Explore the full end-to-end flow with demo data — from property search to rent collection.
          </p>
        </div>

        {/* Simulation Steps */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold mb-4">Rental Journey Simulation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {SIM_STEPS.map((step, i) => (
              <button
                key={i}
                onClick={() => setSimStep(i)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  simStep === i
                    ? "border-primary bg-primary/5 shadow-sm"
                    : i < simStep
                    ? "border-success/30 bg-success/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < simStep ? "bg-success text-success-foreground" : simStep === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {i < simStep ? "✓" : i + 1}
                  </div>
                  <step.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium">{step.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{step.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" size="sm" disabled={simStep === 0} onClick={() => setSimStep(s => s - 1)}>Previous</Button>
            <Button size="sm" disabled={simStep === SIM_STEPS.length - 1} onClick={() => setSimStep(s => s + 1)}>
              Next Step <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="tenant">Tenant View</TabsTrigger>
            <TabsTrigger value="landlord">Landlord View</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* ── Listings Tab ── */}
          <TabsContent value="listings">
            <h2 className="font-display text-xl font-semibold mb-4">Demo Properties</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEMO_LISTINGS.map(listing => (
                <div
                  key={listing.id}
                  onClick={() => setSelectedListing(listing)}
                  className={`bg-card border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    selectedListing.id === listing.id ? "border-primary shadow-sm" : "border-border"
                  }`}
                >
                  <div className="aspect-[16/10] bg-muted overflow-hidden">
                    <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <p className="font-display text-lg font-bold text-primary">£{listing.rent_pcm}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                    <p className="font-medium mt-1 line-clamp-1">{listing.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {listing.postcode}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Bed className="w-3 h-3" /> {listing.bedrooms || "Studio"}</span>
                      <span className="flex items-center gap-1"><Bath className="w-3 h-3" /> {listing.bathrooms}</span>
                      <span>{listing.property_type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected listing detail */}
            <Card className="p-6 mt-6">
              <h3 className="font-display text-xl font-semibold mb-2">{selectedListing.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{selectedListing.address}, {selectedListing.postcode}</p>
              <p className="text-sm mb-4">{selectedListing.description}</p>
              <div className="flex flex-wrap gap-3 mb-4">
                <Badge variant="secondary">{selectedListing.property_type}</Badge>
                <Badge variant="secondary">{selectedListing.furnished}</Badge>
                <Badge variant="secondary">EPC {selectedListing.epc_rating}</Badge>
                {selectedListing.bedrooms > 0 && <Badge variant="secondary">{selectedListing.bedrooms} bed</Badge>}
                <Badge variant="secondary">{selectedListing.bathrooms} bath</Badge>
              </div>
              <div className="flex gap-3">
                <Button className="gap-2"><Calendar className="w-4 h-4" /> Book Viewing</Button>
                <Button variant="outline" className="gap-2"><FileText className="w-4 h-4" /> Apply Now</Button>
              </div>
            </Card>
          </TabsContent>

          {/* ── Tenant View ── */}
          <TabsContent value="tenant">
            <h2 className="font-display text-xl font-semibold mb-4">Tenant Dashboard (Demo)</h2>

            {/* Tenant profile */}
            <Card className="p-5 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{DEMO_TENANT.name}</h3>
                  <p className="text-sm text-muted-foreground">{DEMO_TENANT.email}</p>
                  <p className="text-sm text-muted-foreground mt-1">{DEMO_TENANT.job_title} at {DEMO_TENANT.employer}</p>
                  <p className="text-sm text-muted-foreground">Annual Income: £{DEMO_TENANT.annual_income.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Credit Score</p>
                  <p className="font-display text-2xl font-bold text-success">{DEMO_TENANT.credit_score}</p>
                  <Badge className="bg-success/10 text-success text-xs">{DEMO_TENANT.credit_status}</Badge>
                </div>
              </div>
            </Card>

            {/* Affordability */}
            <Card className="p-5 mb-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Affordability Overview</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Income</p>
                  <p className="font-display text-lg font-bold">£{Math.round(DEMO_TENANT.annual_income / 12).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rent-to-Income</p>
                  <p className="font-display text-lg font-bold text-success">{((selectedListing.rent_pcm / (DEMO_TENANT.annual_income / 12)) * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Months Coverable</p>
                  <p className="font-display text-lg font-bold">{monthsCanCover}</p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: `${Math.min(((selectedListing.rent_pcm / (DEMO_TENANT.annual_income / 12)) * 100), 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Recommended threshold: ≤35%</p>
            </Card>

            {/* Required documents checklist */}
            <Card className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Application Readiness</h3>
              <div className="space-y-2">
                {[
                  { doc: "Photo ID (Passport)", status: "uploaded" },
                  { doc: "Last 3 Payslips", status: "uploaded" },
                  { doc: "Bank Statements (3 months)", status: "uploaded" },
                  { doc: "Employer Reference", status: "completed" },
                  { doc: "Previous Landlord Reference", status: "pending" },
                  { doc: "Credit Check Consent", status: "completed" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm">{item.doc}</span>
                    <Badge className={item.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-success/10 text-success"} variant="secondary">
                      {item.status === "pending" ? "Pending" : "✓ Done"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* ── Landlord View ── */}
          <TabsContent value="landlord">
            <h2 className="font-display text-xl font-semibold mb-4">Landlord Dashboard (Demo)</h2>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Active Listings", value: "3", icon: Building2 },
                { label: "Total Applicants", value: "8", icon: Users },
                { label: "Rent Collected", value: "£22,200", icon: PoundSterling },
                { label: "Open Repairs", value: "2", icon: Wrench },
              ].map(stat => (
                <Card key={stat.label} className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <stat.icon className="w-4 h-4" />
                    <p className="text-xs">{stat.label}</p>
                  </div>
                  <p className="font-display text-xl font-bold">{stat.value}</p>
                </Card>
              ))}
            </div>

            {/* Pipeline */}
            <Card className="p-5 mb-6">
              <h3 className="font-semibold mb-4">Application Pipeline</h3>
              <div className="space-y-2">
                {PIPELINE_STAGES.map(stage => (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className="text-sm w-28 shrink-0">{stage.stage}</span>
                    <div className="flex-1 h-6 bg-muted rounded-lg overflow-hidden">
                      <div className={`h-full ${stage.color} rounded-lg flex items-center px-2`} style={{ width: `${(stage.count / 8) * 100}%` }}>
                        <span className="text-xs font-medium">{stage.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Verification status */}
            <Card className="p-5">
              <h3 className="font-semibold mb-3">Property Verification Status</h3>
              <div className="space-y-3">
                {DEMO_LISTINGS.map((l, i) => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{l.postcode}</p>
                    </div>
                    <Badge className={i === 0 ? "bg-success/10 text-success" : i === 1 ? "bg-amber-500/10 text-amber-600" : "bg-muted"} variant="secondary">
                      {i === 0 ? "Verified" : i === 1 ? "Under Review" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* ── Payments Tab ── */}
          <TabsContent value="payments">
            <h2 className="font-display text-xl font-semibold mb-4">Payment Overview (Demo)</h2>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Paid", value: `£${totalPaid.toLocaleString()}`, color: "text-success" },
                { label: "Outstanding", value: `£${outstanding.toLocaleString()}`, color: "text-destructive" },
                { label: "Months Paid", value: DEMO_PAYMENTS.filter(p => p.status === "paid").length.toString(), color: "text-primary" },
                { label: "Can Cover", value: `${monthsCanCover} months`, color: "text-primary" },
              ].map(stat => (
                <Card key={stat.label} className="p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </Card>
              ))}
            </div>

            {/* Payment Table */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Payment History</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1"><Download className="w-3 h-3" /> CSV</Button>
                  <Button variant="outline" size="sm" className="gap-1"><FileText className="w-3 h-3" /> PDF</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">Due Date</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Late Fee</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Paid On</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_PAYMENTS.map(p => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2">{format(new Date(p.due_date), "d MMM yyyy")}</td>
                        <td className="py-2 text-right font-medium">£{p.amount.toLocaleString()}</td>
                        <td className="py-2 text-right">{p.late_fee > 0 ? `£${p.late_fee}` : "—"}</td>
                        <td className="py-2">
                          <Badge variant={p.status === "paid" ? "default" : p.status === "overdue" ? "destructive" : "secondary"} className="text-xs">
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-muted-foreground">{p.paid_date ? format(new Date(p.paid_date), "d MMM yyyy") : "—"}</td>
                        <td className="py-2 text-right">
                          {p.status === "upcoming" || p.status === "overdue" ? (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowPayment(true)}>
                              <CreditCard className="w-3 h-3" /> Pay
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="gap-1">
                              <Download className="w-3 h-3" /> Receipt
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Simulated Payment Modal */}
            {showPayment && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="p-6 max-w-md w-full space-y-4">
                  <h3 className="font-display text-lg font-bold">Simulated Payment</h3>
                  <p className="text-sm text-muted-foreground">This is a demo simulation of the Stripe checkout process.</p>
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Rent — {selectedListing.title}</span>
                      <span className="font-medium">£{selectedListing.rent_pcm}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border pt-2 font-bold">
                      <span>Total</span>
                      <span>£{selectedListing.rent_pcm}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="border border-border rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Card Number</p>
                      <p className="text-sm font-mono">4242 4242 4242 4242</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Expiry</p>
                        <p className="text-sm font-mono">12/28</p>
                      </div>
                      <div className="border border-border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">CVC</p>
                        <p className="text-sm font-mono">123</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button className="flex-1 gap-2" onClick={() => setShowPayment(false)}>
                      <CheckCircle2 className="w-4 h-4" /> Pay £{selectedListing.rent_pcm} (Demo)
                    </Button>
                    <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">No real payment is processed. This is a simulation only.</p>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
