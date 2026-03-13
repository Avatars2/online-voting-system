import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, teacherAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function TeacherElections() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showCreateElection, setShowCreateElection] = useState(false);
  const [search, setSearch] = useState("");
  
  // Candidate management states
  const [candidates, setCandidates] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [students, setStudents] = useState([]);
  const [showCandidateManagement, setShowCandidateManagement] = useState(false);

  // Form data for creating election
  const [electionFormData, setElectionFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    type: "class"
  });

  // Get current date and time for min validation
  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        
        const userResponse = await authAPI.verifyToken();
        setUser(userResponse.data);

        if (userResponse.data.assignedClass) {
          const [classResponse, electionsResponse, studentsResponse] = await Promise.all([
            adminAPI.getClass(userResponse.data.assignedClass),
            teacherAPI.elections.list(),
            teacherAPI.students.list()
          ]);
          setClassData(classResponse.data);
          setStudents(studentsResponse.data || []);
          setElections(electionsResponse.data || []);
        } else {
          setError("No class assigned to teacher");
        }
      } catch (err) {
        console.error("Failed to load data:", err);
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

  const handleCreateElection = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

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
        level: "class" // Teachers can only create class-level elections
      };

      await teacherAPI.elections.create(electionData);

      success("Election created successfully!");
      setElectionFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        type: "class"
      });
      setShowCreateElection(false);
      
      // Refresh elections list
      const electionsResponse = await teacherAPI.elections.list();
      setElections(electionsResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create election");
      showError(err.response?.data?.error || "Failed to create election");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!selectedElection || !selectedStudent) {
      setError("Please select both election and student");
      return;
    }

    try {
      setLoading(true);
      await teacherAPI.elections.addCandidate(selectedElection, {
        userId: selectedStudent
      });
      
      success("Candidate added successfully!");
      setSelectedStudent("");
      // Refresh elections to get updated candidates
      const electionsResponse = await teacherAPI.elections.list();
      setElections(electionsResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add candidate");
      showError(err.response?.data?.error || "Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminMobileShell title="Class Elections" subtitle="Manage Elections">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminMobileShell>
    );
  }

  if (!classData) {
    return (
      <AdminMobileShell title="Class Elections" subtitle="Manage Elections">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-600 mb-2">Class information not available</div>
            <div className="text-sm text-gray-500">Please contact administrator</div>
          </div>
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

      {successMsg && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200">
          {successMsg}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <input
          type="text"
          placeholder="Search elections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base w-full"
        />
      </div>

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
              .filter(election => !search ? true : String(election.title || "").toLowerCase().includes(search.toLowerCase()))
              .map((election) => {
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
                          {election.candidates && (
                            <span className="ml-2 inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                              {election.candidates.length} Candidates
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {status === 'Upcoming' && (
                          <button
                            onClick={() => {
                              setSelectedElection(election._id);
                              setShowCandidateManagement(true);
                            }}
                            className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium hover:bg-blue-100 transition"
                          >
                            Add Candidates
                          </button>
                        )}
                        {status === 'Closed' && (
                          <button
                            onClick={() => navigate(`/teacher/results/detail?electionId=${election._id}`)}
                            className="px-3 py-1 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium hover:bg-green-100 transition"
                          >
                            View Results
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
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
                min={getMinDateTime()}
                required
              />
              <input
                type="datetime-local"
                placeholder="End Date"
                value={electionFormData.endDate}
                onChange={(e) => setElectionFormData({...electionFormData, endDate: e.target.value})}
                className="input-base"
                min={electionFormData.startDate || getMinDateTime()}
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

      {/* Candidate Management Modal */}
      {showCandidateManagement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 w-full max-w-md">
            <div className="font-bold text-gray-900 mb-3">Add Candidate</div>
            <form onSubmit={handleAddCandidate} className="space-y-3">
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="input-base"
                required
              >
                <option value="">Select Student</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
              
              <div className="flex space-x-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Adding..." : "Add Candidate"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCandidateManagement(false);
                    setSelectedStudent("");
                    setSelectedElection(null);
                  }}
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
