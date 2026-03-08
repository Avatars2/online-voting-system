import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { studentAPI } from "../../services/api";
import StudentMobileShell from "../../components/StudentMobileShell";

export default function StudentResultDetail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const electionId = params.get("electionId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!electionId) return;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await studentAPI.getElectionCandidates(electionId);
        const candidates = res.data?.candidates || [];
        const sortedCandidates = candidates.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        const winner = sortedCandidates.length > 0 ? sortedCandidates[0] : null;
        
        setData({
          candidates: sortedCandidates,
          winner: winner,
          election: res.data?.election || null
        });
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load result details");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [electionId]);

  const candidates = data?.candidates || [];
  const winner = data?.winner || null;
  const election = data?.election || null;
  const maxVotes = Math.max(...candidates.map((c) => c.votes || 0), 1);

  return (
    <StudentMobileShell
      title="Election Outcome"
      subtitle="Final verdict"
      backTo="/student/results"
    >
      {!electionId ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-gray-700">
          Missing electionId.
        </div>
      ) : loading ? (
        <div className="text-white/90 text-sm">Loading...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      ) : (
        <>
          {/* Election Info */}
          {election && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="text-sm font-bold text-gray-700 uppercase mb-2">Election Details</div>
              <div className="text-lg font-semibold text-gray-900">{election.title}</div>
              {election.description && (
                <div className="text-sm text-gray-600 mt-1">{election.description}</div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                {election.level === "department"
                  ? "Department Election"
                  : election.level === "class"
                    ? "Class Election"
                    : "Global Election"}
                {election.endDate && ` • Ended: ${new Date(election.endDate).toLocaleString()}`}
              </div>
            </div>
          )}

          {/* Winner Section */}
          {winner && (
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-yellow-200 mb-4">
              <div className="text-center">
                <div className="text-xs font-semibold tracking-widest text-yellow-700 uppercase">
                  Official Winner
                </div>
                <div className="mt-3 flex justify-center">
                  <div className="w-20 h-20 rounded-full ring-4 ring-yellow-400 overflow-hidden bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-700">
                      {String(winner.name || "?").slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xl font-bold text-gray-900">{winner.name}</div>
                {winner.position && (
                  <div className="text-sm text-gray-600">{winner.position}</div>
                )}
                <div className="inline-block mt-2 px-4 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-semibold">
                  {winner.votes || 0} Total Votes
                </div>
              </div>
            </div>
          )}

          {/* Vote Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="text-sm font-bold text-gray-700 uppercase mb-4">Vote Breakdown</div>
            {candidates.length === 0 ? (
              <div className="text-gray-600">No candidates found.</div>
            ) : (
              <div className="space-y-4">
                {candidates.map((c) => (
                  <div key={c._id}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="font-medium text-gray-900">
                        {c.name}
                        {winner?._id === c._id && (
                          <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                            Winner
                          </span>
                        )}
                      </div>
                      <div className="text-gray-700">{c.votes || 0}</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${winner?._id === c._id ? "bg-yellow-500" : "bg-emerald-600"}`}
                        style={{ width: `${((c.votes || 0) / maxVotes) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Statistics */}
          {candidates.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-4">
              <div className="text-sm font-bold text-gray-700 uppercase mb-3">Statistics</div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{candidates.length}</div>
                  <div className="text-xs text-gray-600">Total Candidates</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {candidates.reduce((sum, c) => sum + (c.votes || 0), 0)}
                  </div>
                  <div className="text-xs text-gray-600">Total Votes</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </StudentMobileShell>
  );
}
