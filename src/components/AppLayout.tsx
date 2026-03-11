import { Sidebar } from "@/components/Sidebar";

interface Props {
  children: React.ReactNode;
}

export function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-background bg-mesh-gradient">
      <Sidebar />
      <main className="ml-[200px] p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
