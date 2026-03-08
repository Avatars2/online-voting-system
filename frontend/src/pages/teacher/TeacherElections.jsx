import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function TeacherElections() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateElection, setShowCreateElection] = useState(false);

  // Form data for creating election
  const [electionFormData, setElectionFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    type: "class"
  });

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
          setElections(electionsResponse.data || []);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load data");
      }
    };

    fetchData();
  }, []);

  const handleCreateElection = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!electionFormData.title.trim()) {
      setError("Election title is required");
      return;
    }
    if (!electionFormData.startDate) {
      setError("Start date is required");
      return;
    }
    if (!electionFormData.endDate) {
      setError("End date is required");
      return;
    }
    if (new Date(electionFormData.endDate) <= new Date(electionFormData.startDate)) {
      setError("End date must be after start date");
      return;
    }

    try {
      setLoading(true);
      
      const electionData = {
        title: electionFormData.title.trim(),
        description: electionFormData.description.trim(),
        startDate: electionFormData.startDate,
        endDate: electionFormData.endDate,
        type: electionFormData.type,
        class: classData._id,
        department: classData.department._id,
        createdBy: user._id
      };

      await adminAPI.elections.create(electionData);

      setSuccess("Election created successfully!");
      setElectionFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        type: "class"
      });
      setShowCreateElection(false);
      
      // Refresh elections list
      const electionsResponse = await adminAPI.elections.list();
      setElections(electionsResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create election");
    } finally {
      setLoading(false);
    }
  };

  if (!classData) {
    return (
      <AdminMobileShell title="Class Elections" subtitle="Manage Elections">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell title="Class Elections" subtitle={`${classData.name} Elections`}>
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200">
          {success}
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

      {/* Create Election Button */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <button
          onClick={() => setShowCreateElection(true)}
          className="btn-primary w-full"
        >
          Create New Election
        </button>
      </div>

      {/* Elections List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Class Elections</div>
          <div className="text-xs font-semibold text-gray-500">{elections.length} TOTAL</div>
        </div>
        <div className="space-y-2">
          {elections.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center text-gray-600">
              No elections created yet
            </div>
          ) : (
            elections
              .filter(election => election.class === classData._id)
              .map((election) => (
                <div key={election._id} className="p-4 border rounded-xl bg-white">
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
                </div>
              ))
          )}
        </div>
      </div>

      {/* Create Election Modal */}
      {showCreateElection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 w-full max-w-md">
            <div className="font-bold text-gray-900 mb-3">Create Election</div>
            <form onSubmit={handleCreateElection} className="space-y-3">
              <input
                type="text"
                placeholder="Election Title"
                value={electionFormData.title}
                onChange={(e) => setElectionFormData({...electionFormData, title: e.target.value})}
                className="input-base"
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={electionFormData.description}
                onChange={(e) => setElectionFormData({...electionFormData, description: e.target.value})}
                className="input-base"
                rows={3}
              />
              <input
                type="datetime-local"
                placeholder="Start Date"
                value={electionFormData.startDate}
                onChange={(e) => setElectionFormData({...electionFormData, startDate: e.target.value})}
                className="input-base"
                required
              />
              <input
                type="datetime-local"
                placeholder="End Date"
                value={electionFormData.endDate}
                onChange={(e) => setElectionFormData({...electionFormData, endDate: e.target.value})}
                className="input-base"
                required
              />
              
              <div className="flex space-x-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Creating..." : "Create Election"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateElection(false)}
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
