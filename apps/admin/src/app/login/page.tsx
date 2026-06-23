import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session?.user.role === "ADMIN") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#e0f2fe_0%,_#f8fafc_38%,_#fde68a_100%)] px-4 py-10 text-slate-900 md:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/50 bg-slate-950 px-8 py-10 text-white shadow-[0_40px_120px_-48px_rgba(15,23,42,0.8)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-300">MyAlongside Admin</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Operate the platform without exposing moderation tools to the public web.</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            This console now requires a verified admin session. Sign in with a backend admin account to access safety intelligence and operational controls.
          </p>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white/90 p-8 shadow-[0_32px_120px_-56px_rgba(15,23,42,0.45)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Secure session</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">Admin sign in</h2>
          <p className="mt-3 text-sm text-slate-600">
            Sessions are stored in an httpOnly cookie and every privileged request is revalidated against the backend.
          </p>

          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}