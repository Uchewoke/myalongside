const users = [
  { id: "u_1", name: "Sarah Chen", role: "MENTOR", status: "Active", event: "Divorce" },
  { id: "u_2", name: "Marcus Williams", role: "MENTOR", status: "Active", event: "Job Loss" },
  { id: "u_3", name: "Alex Rivera", role: "SEEKER", status: "Active", event: "Health Crisis" },
  { id: "u_4", name: "Lena Park", role: "SEEKER", status: "Flagged", event: "Grief" },
];

export default function AdminUsersPage() {
  return (
    <main className="min-h-screen p-8 md:p-10">
      <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
      <p className="mt-1 text-sm text-gray-600">Review users, roles, status, and category alignment.</p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Life Event</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{user.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">{user.event}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-100">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
