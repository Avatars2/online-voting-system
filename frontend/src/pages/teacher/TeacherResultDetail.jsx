import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI, teacherAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function TeacherResultDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const electionId = searchParams.get("electionId");
  
  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [election, setElection] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!electionId) {
        setError("Election ID is required");
        setLoading(false);
        return;
      }

      try {
        const userResponse = await authAPI.verifyToken();
        setUser(userResponse.data);

        if (userResponse.data.assignedClass) {
          const [classResponse, resultsResponse] = await Promise.all([
            teacherAPI.getClass(userResponse.data.assignedClass),
            teacherAPI.results(electionId)
          ]);
          
          setClassData(classResponse.data);
          setResults(resultsResponse.data?.results || []);
          
          // Find election from results or fetch separately
          if (resultsResponse.data?.election) {
            setElection(resultsResponse.data.election);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [electionId]);

  const getTotalVotes = () => {
    return results.reduce((sum, result) => sum + result.votes, 0);
  };

  const getWinner = () => {
    if (results.length === 0) return null;
    return results.reduce((winner, current) => 
      current.votes > winner.votes ? current : winner
    );
  };

  const getPercentage = (votes) => {
    const total = getTotalVotes();
    return total > 0 ? ((votes / total) * 100).toFixed(1) : 0;
  };

  if (loading) {
    return (
      <AdminMobileShell title="Election Results" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading results...</div>
        </div>
      </AdminMobileShell>
    );
  }

  if (error || !election) {
    return (
      <AdminMobileShell title="Election Results" subtitle="Error">
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error || "Election not found"}
        </div>
        <button
          onClick={() => navigate("/teacher/results")}
          className="w-full mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
        >
          Back to Results
        </button>
      </AdminMobileShell>
    );
  }

  const winner = getWinner();
  const totalVotes = getTotalVotes();

  return (
    <AdminMobileShell 
      title="Election Results" 
      subtitle={`${election.title} - ${classData?.name || ""}`}
      backTo="/teacher/results"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Election Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Election Details</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Title:</span>
            <span className="text-sm font-medium">{election.title}</span>
          </div>
          {election.description && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Description:</span>
              <span className="text-sm font-medium text-right">{election.description}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Class:</span>
            <span className="text-sm font-medium">{classData?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Votes:</span>
            <span className="text-sm font-medium">{totalVotes}</span>
          </div>
        </div>
      </div>

      {/* Winner Announcement */}
      {winner && totalVotes > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200 shadow-sm p-4 mb-4">
          <div className="text-center">
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-bold text-gray-900 mb-1">Winner</div>
            <div className="text-lg font-semibold text-orange-700">{winner.candidateName}</div>
            <div className="text-sm text-orange-600">
              {winner.votes} votes ({getPercentage(winner.votes)}%)
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Vote Results</div>
        {results.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No votes recorded yet
          </div>
        ) : (
          <div className="space-y-3">
            {results
              .sort((a, b) => b.votes - a.votes)
              .map((result, index) => (
                <div key={result._id} className="border rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{result.candidateName}</div>
                        <div className="text-xs text-gray-500">{result.candidateEmail}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{result.votes}</div>
                      <div className="text-xs text-gray-500">{getPercentage(result.votes)}%</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-500' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${getPercentage(result.votes)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/teacher/results")}
        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
      >
        Back to Results
      </button>
    </AdminMobileShell>
  );
}
