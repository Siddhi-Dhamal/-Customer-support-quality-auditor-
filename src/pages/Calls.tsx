import { AppLayout } from "@/components/AppLayout";
import { mockAudits } from "@/lib/mock-data";
import { Headphones, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Calls = () => {
  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">Call History</h1>
            <p className="text-muted-foreground mt-1">All uploaded and analyzed calls</p>
          </div>
          <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4 mr-2" /> Clear History
          </Button>
        </div>

        {/* Call List */}
        <div className="space-y-3">
          {mockAudits.map((audit) => (
            <div
              key={audit.id}
              className="glass-card rounded-xl p-5 flex items-center justify-between hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Headphones className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{audit.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{audit.date} {audit.duration}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Ready</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Calls;
