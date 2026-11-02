import type { Metadata } from "next";
import "./globals.css";
import "./nexus-luxe.css"; // must stay AFTER globals.css — navy palette + x100 layer

export const metadata: Metadata = {
  title: "Nexus RPA Studio",
  description: "Enterprise Automation Platform by Zouhir",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* body stays transparent so the Tauri window can keep its rounded, see-through frame */}
      <body className="antialiased bg-transparent">{children}</body>
    </html>
  );
}