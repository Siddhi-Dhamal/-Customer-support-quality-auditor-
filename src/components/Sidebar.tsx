import { NavLink } from "react-router-dom";
import { Home, Phone, BarChart3, Download, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/calls", label: "Calls", icon: Phone },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[200px] bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-heading font-bold text-foreground">AuraQ</h1>
          <p className="text-[10px] text-primary">AI Auditor</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-6 space-y-1">
        <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 w-full transition-all">
          <Download className="h-4 w-4" />
          Downloads
        </button>
        <div className="mx-4 my-3 border-t border-border/30" />
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">U</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
