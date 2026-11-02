import type { Metadata } from "next";
import "./web.css";
import "./web-turbo.css"; // must stay AFTER web.css — it overrides it
import { WebAuthProvider } from "@/contexts/WebAuthContext";
import ScrollChoreographer from "@/components/web/ScrollChoreographer";

export const metadata: Metadata = {
  title: "Nexus Orchestrator",
  description: "Web Dashboard for Nexus RPA",
};

export default function WebLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <WebAuthProvider>
        {children}
        <ScrollChoreographer />
      </WebAuthProvider>
    </div>
  );
}