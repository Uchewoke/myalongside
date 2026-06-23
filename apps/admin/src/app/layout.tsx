import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { getAdminSession } from "@/lib/admin-auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyAlongside Admin",
  description: "Admin dashboard for MyAlongside platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  return (
    <html lang="en">
      <body className="text-gray-900 antialiased">
        {session?.user.role === "ADMIN" ? (
          <AdminShell user={session.user}>{children}</AdminShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
