import React, { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, NavLink } from "react-router-dom";
import { portalApi, getPortalToken, setPortalToken } from "../../lib/portalApi";
import { PawPrint, LogOut, User, CalendarDays, Home } from "lucide-react";

export default function PortalLayout() {
  const [client, setClient] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getPortalToken()) { navigate("/portal/login", { replace: true }); return; }
    portalApi.get("/me")
      .then((r) => setClient(r.data))
      .catch(() => { setPortalToken(null); navigate("/portal/login", { replace: true }); });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-sand-50" data-testid="portal-layout">
      <header className="bg-white border-b border-sand-300/60 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-clinic-red grid place-items-center">
              <PawPrint className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-clinic-navy text-sm leading-tight">Collins</div>
              <div className="text-[10px] uppercase tracking-widest text-clinic-mist">Client Portal</div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <NavLink
              to="/portal"
              end
              className={({ isActive }) =>
                `hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold ${isActive ? "text-clinic-navy" : "text-clinic-mist hover:text-clinic-navy"}`
              }
              data-testid="portal-nav-dashboard"
            >
              <Home className="h-3.5 w-3.5" /> Pets
            </NavLink>
            <NavLink
              to="/portal/book"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-clinic-red text-white"
                    : "bg-clinic-red/10 text-clinic-red hover:bg-clinic-red hover:text-white"
                }`
              }
              data-testid="portal-nav-book"
            >
              <CalendarDays className="h-3.5 w-3.5" /> Book visit
            </NavLink>
            {client && (
              <div className="hidden md:flex items-center gap-2 text-sm text-clinic-navy">
                <User className="h-4 w-4 text-clinic-mist" />
                <span className="font-semibold">{client.first_name} {client.last_name}</span>
              </div>
            )}
            <button
              onClick={() => { setPortalToken(null); navigate("/portal/login"); }}
              className="inline-flex items-center gap-1.5 text-xs text-clinic-mist hover:text-clinic-navy font-semibold"
              data-testid="portal-logout"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet context={{ client }} />
      </main>
    </div>
  );
}
