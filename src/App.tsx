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
import Listings from "./pages/dashboard/Listings";
import NewListing from "./pages/dashboard/NewListing";
import ListingDetail from "./pages/dashboard/ListingDetail";
import Pipeline from "./pages/dashboard/Pipeline";
import Apply from "./pages/Apply";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><DashboardHome /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/profile" element={<ProtectedRoute><DashboardLayout><TenantProfile /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/documents" element={<ProtectedRoute><DashboardLayout><TenantDocuments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/references" element={<ProtectedRoute><DashboardLayout><TenantReferences /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/applications" element={<ProtectedRoute><DashboardLayout><TenantApplications /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/listings" element={<ProtectedRoute><DashboardLayout><Listings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/listings/new" element={<ProtectedRoute><DashboardLayout><NewListing /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/listings/:id" element={<ProtectedRoute><DashboardLayout><ListingDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/dashboard/pipeline" element={<ProtectedRoute><DashboardLayout><Pipeline /></DashboardLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
