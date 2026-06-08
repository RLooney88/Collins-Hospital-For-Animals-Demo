import React from "react";
import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { SmartSiteProvider } from "./context/SmartSiteContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatWidgetSlot from "./components/ChatWidgetSlot";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Appointment from "./pages/Appointment";
import About from "./pages/About";
import AnimalPage from "./pages/AnimalPage";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminSurfaces from "./pages/admin/AdminSurfaces";
import AdminSessions from "./pages/admin/AdminSessions";
import AdminChatbot from "./pages/admin/AdminChatbot";
import AdminChatBookings from "./pages/admin/AdminChatBookings";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminCalendarConfig from "./pages/admin/AdminCalendarConfig";
import AdminClientsPets from "./pages/admin/AdminClientsPets";
import AdminSiteEditor from "./pages/admin/AdminSiteEditor";
import PortalLogin from "./pages/portal/PortalLogin";
import PortalLayout from "./pages/portal/PortalLayout";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalPetDetail from "./pages/portal/PortalPetDetail";
import PortalBook from "./pages/portal/PortalBook";

function PublicShell({ children }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  const isPortal = pathname.startsWith("/portal");
  if (isAdmin || isPortal) return children;
  const isHome = pathname === "/";
  return (
    <>
      <Navbar />
      <main className={isHome ? "pb-20" : "pt-20 pb-20"}>{children}</main>
      <Footer />
      <ChatWidgetSlot />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SmartSiteProvider>
        <Toaster richColors position="top-right" />
        <ScrollToTop />
        <PublicShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/appointment" element={<Appointment />} />
            <Route path="/about" element={<About />} />
            <Route path="/dogs" element={<AnimalPage />} />
            <Route path="/cats" element={<AnimalPage />} />
            <Route path="/critters" element={<AnimalPage />} />

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="chat-bookings" element={<AdminChatBookings />} />
              <Route path="appointments" element={<AdminAppointments />} />
              <Route path="calendar-config" element={<AdminCalendarConfig />} />
              <Route path="clients-pets" element={<AdminClientsPets />} />
              <Route path="surfaces" element={<AdminSurfaces />} />
              <Route path="chatbot" element={<AdminChatbot />} />
              <Route path="sessions" element={<AdminSessions />} />
              <Route path="site-editor" element={<AdminSiteEditor />} />
            </Route>

            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<PortalDashboard />} />
              <Route path="book" element={<PortalBook />} />
              <Route path="pets/:petId" element={<PortalPetDetail />} />
            </Route>

            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </PublicShell>
      </SmartSiteProvider>
    </BrowserRouter>
  );
}

export default App;
