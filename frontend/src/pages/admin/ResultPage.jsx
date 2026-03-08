import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function ResultPage() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchElections = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await adminAPI.elections.list();
        setElections(res.data || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load elections");
        setElections([]);
      } finally {
        setLoading(false);
      }
    };
    fetchElections();
  }, []);

  // Filter elections for results - only show elections that have ended
  const now = new Date();
  const completedElections = elections.filter(e => {
    const endDate = e.endDate ? new Date(e.endDate) : null;
    return endDate && endDate < now;
  });

  const filteredElections = completedElections.filter((e) =>
    !search ? true : String(e.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminMobileShell
      title="Election Results"
      subtitle="Archive of completed polls"
      backTo="/admin/dashboard"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input
          className="input-base"
          placeholder="Search elections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin text-2xl mb-2">⏳</div>
            <div className="text-gray-600">Loading elections...</div>
          </div>
        ) : filteredElections.length > 0 ? (
          <div className="mt-3 space-y-2">
            {filteredElections.map((e) => (
              <button
                key={e._id}
                onClick={() => navigate(`/admin/results/detail?electionId=${e._id}`)}
                className="w-full text-left p-4 rounded-xl border hover:border-slate-300 hover:bg-slate-50 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{e.title}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {e.level === "department"
                        ? `Department`
                        : e.level === "class"
                          ? `Class`
                          : `All College (Global)`}
                      {e.endDate && ` • Ended: ${new Date(e.endDate).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {typeof e.candidateCount === "number" ? `${e.candidateCount} candidates` : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-600">
              {search ? "No elections found matching your search." : "No completed elections available yet."}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Results will be shown after elections end.
            </div>
          </div>
        )}
      </div>
    </AdminMobileShell>
  );
}
