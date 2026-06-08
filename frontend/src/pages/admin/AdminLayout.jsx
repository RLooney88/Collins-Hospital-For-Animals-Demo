import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminApi, getAdminToken, setAdminToken } from "../../lib/api";
import {
  Activity,
  Bot,
  CalendarClock,
  CalendarDays,
  CalendarCog,
  HeartPulse,
  Inbox,
  Layers,
  LayoutGrid,
  LogOut,
  PencilLine,
  Users,
} from "lucide-react";

const NAV = [
  { to: "/admin", label: "Overview", icon: Activity, end: true },
  { to: "/admin/leads", label: "Leads", icon: Inbox },
  { to: "/admin/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/admin/chat-bookings", label: "Chat Bookings", icon: CalendarClock },
  { to: "/admin/calendar-config", label: "Calendar Setup", icon: CalendarCog },
  { to: "/admin/clients-pets", label: "Clients & Pets", icon: HeartPulse },
  { to: "/admin/surfaces", label: "Surfaces & Switches", icon: Layers },
  { to: "/admin/chatbot", label: "Chatbot", icon: Bot },
  { to: "/admin/site-editor", label: "Site Editor", icon: PencilLine },
  { to: "/admin/sessions", label: "Sessions", icon: Users },
];

export default function AdminLayout() {
  const [me, setMe] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getAdminToken()) {
      navigate("/admin/login", { replace: true });
      return;
    }
    adminApi
      .get("/admin/me")
      .then((r) => setMe(r.data))
      .catch(() => navigate("/admin/login", { replace: true }));
  }, [navigate]);

  const logout = () => {
    setAdminToken(null);
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-sand-50 flex" data-testid="admin-layout">
      <aside className="w-64 shrink-0 bg-white border-r border-sand-300/60 flex flex-col" data-testid="admin-sidebar">
        <div className="px-6 py-6 border-b border-sand-300/60">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">
            <LayoutGrid className="h-3.5 w-3.5" /> Smart Site
          </div>
          <div className="font-display text-xl font-extrabold text-clinic-navy mt-1">Admin Console</div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? "admin-nav-active" : "text-clinic-mist hover:bg-sand-200/80 hover:text-clinic-navy"
                  }`
                }
                data-testid={`admin-nav-${n.label.toLowerCase().replace(/[^a-z]/g, "-")}`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sand-300/60">
          <div className="text-xs text-clinic-mist">Signed in as</div>
          <div className="text-sm font-bold text-clinic-navy truncate">{me?.email || "…"}</div>
          <button
            onClick={logout}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full border border-sand-300 hover:border-clinic-navy/30 text-clinic-navy py-2 text-xs font-semibold"
            data-testid="admin-logout"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-8 lg:p-12 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
