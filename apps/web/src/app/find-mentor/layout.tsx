import DashboardLayout from "@/app/dashboard/layout";

// Find mentor shares the same dashboard shell
export default function FindMentorLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
