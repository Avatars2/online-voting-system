import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function HODResults() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userResponse = await authAPI.verifyToken();
      setUser(userResponse.data);

      if (userResponse.data.assignedDepartment) {
        const electionsResponse = await adminAPI.elections.list();
        setElections(electionsResponse.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const viewResults = async (electionId) => {
    try {
      navigate(`/hod/results/detail`, { state: { electionId } });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load results");
    }
  };

  if (loading) {
    return (
      <AdminMobileShell
        title="Election Results"
        subtitle="View election results"
        headerColor="bg-gradient-to-r from-green-600 to-teal-700"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminMobileShell>
    );
  }

  const departmentElections = elections.filter(election => election.department === user.assignedDepartment);

  return (
    <AdminMobileShell
      title="Election Results"
      subtitle="View department election results"
      headerColor="bg-gradient-to-r from-green-600 to-teal-700"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Department Elections</div>
        <div className="space-y-3">
          {departmentElections.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-3">📊</div>
              <div>No elections created yet</div>
              <button
                onClick={() => navigate("/hod/elections")}
                className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
              >
                Create Election
              </button>
            </div>
          ) : (
            departmentElections.map((election) => (
              <div key={election._id} className="p-4 border rounded-xl bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">{election.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{election.description}</div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    new Date() > new Date(election.endDate) 
                      ? 'bg-gray-100 text-gray-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {new Date() > new Date(election.endDate) ? 'Completed' : 'Active'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span>
                    {election.type === "department" ? "Department Level" : `Class: ${election.targetClass?.name}`}
                  </span>
                  <span>
                    {new Date(election.startDate).toLocaleDateString()} - {new Date(election.endDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => viewResults(election._id)}
                    className="flex-1 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
                  >
                    View Results
                  </button>
                  <button
                    onClick={() => navigate(`/hod/elections/${election._id}/candidates`)}
                    className="flex-1 p-2 bg-purple-50 border border-purple-200 rounded text-purple-700 text-sm font-medium hover:bg-purple-100 transition"
                  >
                    Manage Candidates
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-4">
        <div className="font-bold text-gray-900 mb-3">Quick Actions</div>
        <div className="space-y-2">
          <button
            onClick={() => navigate("/hod/elections")}
            className="w-full p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium hover:bg-green-100 transition"
          >
            Create New Election
          </button>
          <button
            onClick={() => navigate("/hod/dashboard")}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </AdminMobileShell>
  );
}
