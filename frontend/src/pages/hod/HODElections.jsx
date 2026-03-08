import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function HODElections() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "department", // department or class
    targetClass: "",
    startDate: "",
    endDate: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userResponse = await authAPI.verifyToken();
      setUser(userResponse.data);

      if (userResponse.data.assignedDepartment) {
        const [classesResponse, electionsResponse] = await Promise.all([
          adminAPI.classes.list(userResponse.data.assignedDepartment),
          adminAPI.elections.list()
        ]);
        setClasses(classesResponse.data || []);
        setElections(electionsResponse.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load data");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.title.trim()) {
      setError("Election title is required");
      return;
    }
    if (formData.type === "class" && !formData.targetClass) {
      setError("Please select a class for class-level elections");
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError("Start and end dates are required");
      return;
    }

    try {
      setLoading(true);
      
      const electionData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        department: user.assignedDepartment,
        targetClass: formData.type === "class" ? formData.targetClass : null,
        startDate: formData.startDate,
        endDate: formData.endDate
      };

      await adminAPI.elections.create(electionData);
      
      setSuccess("Election created successfully!");
      setFormData({
        title: "",
        description: "",
        type: "department",
        targetClass: "",
        startDate: "",
        endDate: ""
      });
      
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create election");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <AdminMobileShell
        title="Manage Elections"
        subtitle="Create department and class elections"
        headerColor="bg-gradient-to-r from-green-600 to-teal-700"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell
      title="Manage Elections"
      subtitle="Create department and class elections"
      headerColor="bg-gradient-to-r from-green-600 to-teal-700"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 mb-4">
          {success}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Create New Election</div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Election Title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="input-base"
          />
          
          <textarea
            placeholder="Election Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="input-base h-20 resize-none"
            rows={3}
          />

          <select
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value, targetClass: ""})}
            className="input-base"
          >
            <option value="department">Department Level Election</option>
            <option value="class">Class Level Election</option>
          </select>

          {formData.type === "class" && (
            <select
              value={formData.targetClass}
              onChange={(e) => setFormData({...formData, targetClass: e.target.value})}
              className="input-base"
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} {cls.year ? `- ${cls.year}` : ""}
                </option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="input-base"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating..." : "Create Election"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Recent Elections</div>
        <div className="space-y-2">
          {elections.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No elections created yet</div>
          ) : (
            elections
              .filter(election => election.department === user.assignedDepartment)
              .map((election) => (
              <div key={election._id} className="p-3 border rounded-xl">
                <div className="font-semibold text-gray-900">{election.title}</div>
                <div className="text-sm text-gray-600 mt-1">{election.description}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {election.type === "department" ? "Department Level" : `Class: ${election.targetClass?.name}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(election.startDate).toLocaleDateString()} - {new Date(election.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => navigate(`/hod/elections/${election._id}/candidates`)}
                    className="flex-1 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
                  >
                    Add Candidates
                  </button>
                  <button
                    onClick={() => navigate(`/hod/elections/${election._id}/results`)}
                    className="flex-1 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm font-medium hover:bg-green-100 transition"
                  >
                    View Results
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminMobileShell>
  );
}
