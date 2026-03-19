import { TrendingUp, PhoneCall, MessageSquare, BarChart3 } from "lucide-react";

const stats = [
  { label: "Total Audits", value: "1,284", change: "+12.5%", icon: BarChart3, positive: true },
  { label: "Calls Analyzed", value: "847", change: "+8.2%", icon: PhoneCall, positive: true },
  { label: "Chats Analyzed", value: "437", change: "+18.9%", icon: MessageSquare, positive: true },
  { label: "Avg. Score", value: "87.4", change: "+3.1%", icon: TrendingUp, positive: true },
];

export function StatsOverview() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card rounded-xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{stat.label}</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-heading font-bold">{stat.value}</span>
            <span className="text-xs text-success mb-1">{stat.change}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
