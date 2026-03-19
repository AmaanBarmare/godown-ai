import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ManagerRoute } from "@/components/ManagerRoute";
import Index from "./pages/Index";
import Companies from "./pages/Companies";
import InvoiceGenerator from "./pages/InvoiceGenerator";
import InvoiceHistory from "./pages/InvoiceHistory";
import Members from "./pages/Members";
import Settings from "./pages/Settings";
import PaymentReminder from "./pages/PaymentReminder";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import Login from "./pages/Login";
import AcceptInvite from "./pages/AcceptInvite";
import Setup from "./pages/Setup";
import TeamManagement from "./pages/TeamManagement";
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
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />

            {/* Setup (protected but no profile required) */}
            <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/team" element={<AdminRoute><TeamManagement /></AdminRoute>} />

            {/* View-only routes (all roles) */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
            <Route path="/invoice-history" element={<ProtectedRoute><InvoiceHistory /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />

            {/* Operational routes (admin + manager only) */}
            <Route path="/invoice-generator" element={<ManagerRoute><InvoiceGenerator /></ManagerRoute>} />
            <Route path="/settings" element={<ManagerRoute><Settings /></ManagerRoute>} />
            <Route path="/payment-reminder" element={<ManagerRoute><PaymentReminder /></ManagerRoute>} />
            <Route path="/payment-confirmation" element={<ManagerRoute><PaymentConfirmation /></ManagerRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
