import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
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

            {/* Protected app routes */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
            <Route path="/invoice-generator" element={<ProtectedRoute><InvoiceGenerator /></ProtectedRoute>} />
            <Route path="/invoice-history" element={<ProtectedRoute><InvoiceHistory /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/payment-reminder" element={<ProtectedRoute><PaymentReminder /></ProtectedRoute>} />
            <Route path="/payment-confirmation" element={<ProtectedRoute><PaymentConfirmation /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
