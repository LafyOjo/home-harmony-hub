import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import DashboardHome from "./pages/dashboard/DashboardHome";
import TenantProfile from "./pages/dashboard/TenantProfile";
import TenantDocuments from "./pages/dashboard/TenantDocuments";
import TenantReferences from "./pages/dashboard/TenantReferences";
import TenantApplications from "./pages/dashboard/TenantApplications";
import TenantMyTenancy from "./pages/dashboard/TenantMyTenancy";
import TenantUtilities from "./pages/dashboard/TenantUtilities";
import TenantComplaints from "./pages/dashboard/TenantComplaints";
import TenantMaintenance from "./pages/dashboard/TenantMaintenance";
import TenantContracts from "./pages/dashboard/TenantContracts";
import TenantVerification from "./pages/dashboard/TenantVerification";
import TenantPolicies from "./pages/dashboard/TenantPolicies";
import Listings from "./pages/dashboard/Listings";
import NewListing from "./pages/dashboard/NewListing";
import ListingDetail from "./pages/dashboard/ListingDetail";
import Pipeline from "./pages/dashboard/Pipeline";
import LandlordTenancies from "./pages/dashboard/LandlordTenancies";
import LandlordTenancyDetail from "./pages/dashboard/LandlordTenancyDetail";
import LandlordWorkers from "./pages/dashboard/LandlordWorkers";
import LandlordVerification from "./pages/dashboard/LandlordVerification";
import LandlordAccounting from "./pages/dashboard/LandlordAccounting";
import LandlordUtilities from "./pages/dashboard/LandlordUtilities";
import LandlordComplaints from "./pages/dashboard/LandlordComplaints";
import LandlordContracts from "./pages/dashboard/LandlordContracts";
import MaintenanceDashboard from "./pages/dashboard/MaintenanceDashboard";
import LandlordPolicies from "./pages/dashboard/LandlordPolicies";
import TenantAccounting from "./pages/dashboard/TenantAccounting";
import Apply from "./pages/Apply";
import SearchListings from "./pages/SearchListings";
import ListingPublicDetail from "./pages/ListingPublicDetail";
import ReferenceSubmit from "./pages/ReferenceSubmit";
import NewApplication from "./pages/dashboard/NewApplication";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/apply/:token" element={<Apply />} />
            <Route path="/listings" element={<SearchListings />} />
            <Route path="/listings/:id" element={<ListingPublicDetail />} />
            <Route path="/reference/:token" element={<ReferenceSubmit />} />
            {/* Tenant routes */}
            <Route path="/dashboard" element={<P><DashboardHome /></P>} />
            <Route path="/dashboard/profile" element={<P><TenantProfile /></P>} />
            <Route path="/dashboard/documents" element={<P><TenantDocuments /></P>} />
            <Route path="/dashboard/references" element={<P><TenantReferences /></P>} />
            <Route path="/dashboard/applications" element={<P><TenantApplications /></P>} />
            <Route path="/dashboard/applications/new/:listingId" element={<P><NewApplication /></P>} />
            <Route path="/dashboard/tenancy" element={<P><TenantMyTenancy /></P>} />
            <Route path="/dashboard/utilities" element={<P><TenantUtilities /></P>} />
            <Route path="/dashboard/complaints" element={<P><TenantComplaints /></P>} />
            <Route path="/dashboard/maintenance" element={<P><TenantMaintenance /></P>} />
            <Route path="/dashboard/contracts" element={<P><TenantContracts /></P>} />
            <Route path="/dashboard/verification" element={<P><TenantVerification /></P>} />
            <Route path="/dashboard/policies" element={<P><TenantPolicies /></P>} />
            <Route path="/dashboard/accounting" element={<P><TenantAccounting /></P>} />
            {/* Landlord routes */}
            <Route path="/dashboard/listings" element={<P><Listings /></P>} />
            <Route path="/dashboard/listings/new" element={<P><NewListing /></P>} />
            <Route path="/dashboard/listings/:id" element={<P><ListingDetail /></P>} />
            <Route path="/dashboard/pipeline" element={<P><Pipeline /></P>} />
            <Route path="/dashboard/tenancies" element={<P><LandlordTenancies /></P>} />
            <Route path="/dashboard/tenancies/:id" element={<P><LandlordTenancyDetail /></P>} />
            <Route path="/dashboard/workers" element={<P><LandlordWorkers /></P>} />
            <Route path="/dashboard/landlord-verification" element={<P><LandlordVerification /></P>} />
            <Route path="/dashboard/accounting" element={<P><LandlordAccounting /></P>} />
            <Route path="/dashboard/landlord-utilities" element={<P><LandlordUtilities /></P>} />
            <Route path="/dashboard/landlord-complaints" element={<P><LandlordComplaints /></P>} />
            <Route path="/dashboard/landlord-contracts" element={<P><LandlordContracts /></P>} />
            <Route path="/dashboard/landlord-maintenance" element={<P><MaintenanceDashboard /></P>} />
            <Route path="/dashboard/landlord-policies" element={<P><LandlordPolicies /></P>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
