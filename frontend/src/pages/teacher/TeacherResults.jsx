import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function TeacherResults() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await authAPI.verifyToken();
        setUser(userResponse.data);

        if (userResponse.data.assignedClass) {
          const [classResponse, electionsResponse] = await Promise.all([
            adminAPI.getClass(userResponse.data.assignedClass),
            adminAPI.elections.list()
          ]);
          setClassData(classResponse.data);
          
          // Filter elections created by this teacher for their class
          const teacherElections = (electionsResponse.data || []).filter(
            election => election.class === classResponse.data._id && election.createdBy === userResponse.data._id
          );
          setElections(teacherElections);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getElectionStatus = (election) => {
    const now = new Date();
    const start = election.startDate ? new Date(election.startDate) : null;
    const end = election.endDate ? new Date(election.endDate) : null;
    
    if (start && now < start) return 'Upcoming';
    if (end && now > end) return 'Closed';
    return 'Active';
  };

  const handleViewResults = (electionId) => {
    navigate(`/teacher/results/detail?electionId=${electionId}`);
  };

  if (loading) {
    return (
      <AdminMobileShell title="Election Results" subtitle="View Results">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminMobileShell>
    );
  }

  if (!classData) {
    return (
      <AdminMobileShell title="Election Results" subtitle="View Results">
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          No class assigned
        </div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell title="Election Results" subtitle={`${classData.name} Results`}>
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Class Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Class Information</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Class:</span>
            <span className="text-sm font-medium">{classData.name}</span>
          </div>
          {classData.year && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Year:</span>
              <span className="text-sm font-medium">{classData.year}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Department:</span>
            <span className="text-sm font-medium">{classData.department?.name}</span>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Your Election Results</div>
          <div className="text-xs font-semibold text-gray-500">{elections.length} TOTAL</div>
        </div>
        <div className="space-y-2">
          {elections.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center text-gray-600">
              No elections created yet. Create elections to see results here.
            </div>
          ) : (
            elections.map((election) => {
              const status = getElectionStatus(election);
              return (
                <div key={election._id} className="p-4 border rounded-xl bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{election.title}</div>
                      {election.description && (
                        <div className="text-sm text-gray-600 mt-1">{election.description}</div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        Start: {new Date(election.startDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        End: {new Date(election.endDate).toLocaleDateString()}
                      </div>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          status === 'Active' ? 'bg-green-100 text-green-700' :
                          status === 'Closed' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {status}
                        </span>
                      </div>
                    </div>
                    {status === 'Closed' && (
                      <button
                        onClick={() => handleViewResults(election._id)}
                        className="ml-3 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
                      >
                        View Results
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/teacher/dashboard")}
        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
      >
        Back to Dashboard
      </button>
    </AdminMobileShell>
  );
}
