import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, hodAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import EnhancedInput from "../../components/UI/EnhancedInput";
import EnhancedButton from "../../components/UI/EnhancedButton";
import { useToast } from "../../components/UI/Toast";

export default function HODElections() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [user, setUser] = useState(null);
  const [department, setDepartment] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    level: "department", // HOD starts with department level
    department: "",
    class: "", // Use class instead of targetClass to match admin
  });
  
  // Candidate management states
  const [candidates, setCandidates] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

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
    fetchData();
  }, []);

  // Separate function to fetch elections like admin page
  const fetchElections = async () => {
    try {
      console.log("Fetching HOD elections...");
      const res = await hodAPI.elections.list();
      console.log("Fetched elections response:", res);
      console.log("Fetched elections data:", res.data);
      setElections(res.data || []);
    } catch (error) {
      console.error("Error fetching elections:", error);
      console.error("Error response:", error.response);
      setElections([]);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  const fetchData = async () => {
    try {
      const userResponse = await authAPI.verifyToken();
      console.log("User response:", userResponse.data);
      const userData = userResponse.data;
      setUser(userData);

      // Debug: Log all user data fields
      console.log("Complete user data:", JSON.stringify(userData, null, 2));
      console.log("User department fields:");
      console.log("- userData.department:", userData.department);
      console.log("- userData.assignedDepartment:", userData.assignedDepartment);

      // Get department info from API (backend will return correct department based on HOD's email)
      try {
        const deptResponse = await hodAPI.getDepartment();
        console.log("Department API response:", deptResponse.data);
        
        if (deptResponse.data && deptResponse.data.length > 0) {
          const deptData = deptResponse.data[0]; // Backend returns correct department
          console.log("Department data found:", deptData);
          setDepartment(deptData);
          
          // Set department in form data
          setFormData(prev => {
            const updated = {
              ...prev,
              department: deptData._id
            };
            console.log("Form data updated with department:", updated);
            return updated;
          });
          
          // Get all other data (except elections - loaded separately)
          try {
            const [classesResponse, studentsResponse] = await Promise.all([
              hodAPI.classes.list(),
              hodAPI.students.list()
            ]);
            console.log("HOD Classes loaded:", classesResponse.data);
            setClasses(classesResponse.data || []);
            console.log("HOD Students loaded:", studentsResponse.data);
            setStudents(studentsResponse.data || []);
          } catch (dataError) {
            console.error("Error loading other data:", dataError);
          }
          
          return; // Success, exit early
        }
      } catch (deptError) {
        console.error("Department API error:", deptError);
      }
      
      // If we reach here, department wasn't found
      console.error("No department found for HOD");
      setError("No department found for your account. Please contact administrator.");
    } catch (err) {
      console.error("Fetch data error:", err);
      setError(err.response?.data?.error || "Failed to load data");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!formData.title.trim()) {
      setError("Election title is required");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || "",
        level: formData.level,
      };
      if (formData.startDate) payload.startDate = new Date(formData.startDate);
      if (formData.endDate) payload.endDate = new Date(formData.endDate);
      
      // For HOD, use department from form data or fallback to user data
      let departmentId = formData.department;
      
      // Multiple fallbacks for department ID - prioritize department field (where registered)
      if (!departmentId && user?.department) {
        departmentId = user.department;
        console.log("Using fallback department (where HOD was registered):", departmentId);
        // Update form data for future submissions
        setFormData(prev => ({ ...prev, department: departmentId }));
      } else if (!departmentId && user?.assignedDepartment) {
        departmentId = user.assignedDepartment;
        console.log("Using fallback assigned department:", departmentId);
        // Update form data for future submissions
        setFormData(prev => ({ ...prev, department: departmentId }));
      } else if (!departmentId) {
        // Last resort - try to get from localStorage or refresh
        console.log("No department found, attempting to refresh user data");
        await fetchData();
        departmentId = formData.department || user?.department || user?.assignedDepartment;
      }
      
      console.log("HOD creating election with department:", departmentId);
      console.log("User data:", user);
      console.log("Form data:", formData);
      
      if (!departmentId) {
        setError("Department not available. Please refresh the page.");
        return;
      }
      
      // Validate department ID format (MongoDB ObjectId)
      if (!/^[0-9a-fA-F]{24}$/.test(departmentId)) {
        setError("Invalid department ID format. Please contact administrator.");
        console.error("Invalid department ID format:", departmentId);
        return;
      }
      
      // Always include department for HOD elections
      if (formData.level === "department" || formData.level === "class") {
        payload.department = departmentId;
      }
      
      if (formData.level === "class") {
        if (!formData.class) {
          setError("Please select a class for class-level elections");
          return;
        }
        payload.class = formData.class;
      }
      
      console.log("Final payload:", payload);
      
      await hodAPI.elections.create(payload);
      
      // Reset form like admin
      setFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        level: "department",
        department: formData.department, // Keep the department from form
        class: "",
      });
      
      success('Election created successfully!');
      fetchElections(); // Refresh elections list like admin page
    } catch (err) {
      console.error("Election creation error:", err);
      console.error("Error response:", err.response);
      console.error("Error data:", err.response?.data);
      
      const errorMessage = err.response?.data?.error || "Failed to create election";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddCandidate = async () => {
    if (!selectedElection || !selectedStudent) {
      setError("Select an election and student");
      return;
    }
    setLoading(true);
    try {
      await hodAPI.elections.addCandidate(selectedElection, {
        userId: selectedStudent,
        position: "Candidate", // Fixed position like admin
      });
      setSelectedStudent("");
      setStudentSearch("");
      success("Candidate added successfully!");
      fetchElections(); // Refresh elections list like admin page
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add candidate");
      showError(err.response?.data?.error || "Failed to add candidate");
    } finally {
      setLoading(false);
    }
  };

  const selectedElectionObj = elections.find((e) => e._id === selectedElection);
  const eligibleStudents = students.filter((s) => {
    if (!selectedElectionObj) return false;
    if (!selectedElectionObj.level || selectedElectionObj.level === "global") return true;
    if (selectedElectionObj.level === "department") {
      return s.department?._id === selectedElectionObj.department?._id;
    }
    if (selectedElectionObj.level === "class") {
      return s.class?._id === selectedElectionObj.class?._id;
    }
    return true;
  });

  // Filter students based on search
  const filteredStudents = eligibleStudents.filter((s) => {
    if (!studentSearch) return true;
    const searchLower = studentSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(searchLower) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchLower))
    );
  });

  // Sort elections by status (backend already filters by department)
  const getSortedElections = (elections) => {
    const now = new Date();
    return elections.sort((a, b) => {
      const aStart = a.startDate ? new Date(a.startDate) : null;
      const aEnd = a.endDate ? new Date(a.endDate) : null;
      const bStart = b.startDate ? new Date(b.startDate) : null;
      const bEnd = b.endDate ? new Date(b.endDate) : null;
      
      // Status priority: Upcoming (1), Active (2), Ended (3)
      const getStatusPriority = (start, end) => {
        if (start && start > now) return 1; // Upcoming
        if (end && end < now) return 3; // Ended
        return 2; // Active
      };
      
      const aPriority = getStatusPriority(aStart, aEnd);
      const bPriority = getStatusPriority(bStart, bEnd);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same status, sort by date
      if (aPriority === 1) return aStart - bStart; // Upcoming: earliest first
      if (aPriority === 3) return bEnd - aEnd; // Ended: most recent first
      return aStart - bStart; // Active: earliest start first
    });
  };

  console.log("Elections Debug:");
  console.log("- Total Elections from API:", elections.length);
  console.log("- All Elections:", elections);
  
  // Backend already filters by department, so just categorize by level
  const departmentElections = getSortedElections(elections.filter(e => 
    !e.level || e.level === "department"
  ));
  const classElections = getSortedElections(elections.filter(e => 
    e.level === "class"
  ));
  
  console.log("- Department Elections:", departmentElections);
  console.log("- Class Elections:", classElections);

  // Get status for each election
  const getElectionStatus = (election) => {
    const now = new Date();
    const startDate = election.startDate ? new Date(election.startDate) : null;
    const endDate = election.endDate ? new Date(election.endDate) : null;
    
    if (startDate && startDate > now) return { text: "Upcoming", color: "text-blue-700 bg-blue-50" };
    if (endDate && endDate < now) return { text: "Ended", color: "text-gray-700 bg-gray-50" };
    return { text: "Active", color: "text-green-700 bg-green-50" };
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
      title="Election Hub"
      subtitle="Live polling & governance"
      headerColor="bg-gradient-to-r from-indigo-600 to-purple-700"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      
      {successMsg && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 mb-4">
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="text-sm font-bold text-gray-600 uppercase mb-3">Create New Election</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Election Level</label>
            <select
              className="input-base"
              name="level"
              value={formData.level}
              onChange={(e) => {
                const { name, value } = e.target;
                setFormData((prev) => {
                  const next = { ...prev, [name]: value };
                  if (name === "level") {
                    next.class = "";
                  }
                  if (name === "department") {
                    next.class = "";
                  }
                  return next;
                });
              }}
              disabled={loading}
            >
              <option value="department">Department Level</option>
              <option value="class">Class Level</option>
            </select>
          </div>

          {formData.level === "department" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input
                type="text"
                className="input-base bg-gray-50"
                value={department?.name || (formData.department ? "Department " + formData.department.substring(0, 8) + "..." : "Loading...")}
                disabled={true}
                readOnly
              />
              <input type="hidden" name="department" value={formData.department} />
            </div>
          )}

          {formData.level === "class" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  className="input-base"
                  name="department"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value, class: ""})}
                  disabled={loading}
                >
                  {department ? (
                    <option key={department._id} value={department._id}>
                      {department.name}
                    </option>
                  ) : (
                    <option value="">Loading Department...</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                <select
                  className="input-base"
                  name="class"
                  value={formData.class}
                  onChange={(e) => setFormData({...formData, class: e.target.value})}
                  disabled={loading || !formData.department}
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name} {cls.year ? `- ${cls.year}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Election Title</label>
            <EnhancedInput
              type="text"
              placeholder="e.g., President Election 2024"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              disabled={loading}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <EnhancedInput
              type="textarea"
              placeholder="Election description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              disabled={loading}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <EnhancedInput
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                disabled={loading}
                min={getMinDateTime()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <EnhancedInput
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                disabled={loading}
                min={formData.startDate || getMinDateTime()}
              />
            </div>
          </div>
          
          <EnhancedButton
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
            variant="primary"
            size="lg"
            className="w-full"
          >
            {loading ? "Creating Election..." : "Create Election"}
          </EnhancedButton>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-bold text-gray-600 uppercase mb-3">Add Candidates</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Election</label>
            <select
              className="input-base mb-4"
              value={selectedElection || ""}
              onChange={(e) => setSelectedElection(e.target.value || null)}
            >
              <option value="">Select Election</option>
              {elections.filter(e => {
                const startDate = e.startDate ? new Date(e.startDate) : null;
                return !startDate || startDate > new Date();
              }).map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title}{" "}
                  {e.level === "department"
                    ? `• Dept`
                    : e.level === "class"
                      ? `• Class`
                      : `• Global`}
                  {e.startDate && ` • Starts: ${new Date(e.startDate).toLocaleDateString()}`}
                </option>
              ))}
            </select>
            <div className="space-y-3 mb-4">
              <input
                type="text"
                className="input-base"
                placeholder="Search by student name or ID..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                disabled={!selectedElection}
              />
              <select
                className="input-base"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                disabled={!selectedElection}
              >
                <option value="">Select Student</option>
                {filteredStudents.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.studentId ? `(${s.studentId})` : ""}
                  </option>
                ))}
              </select>
              <EnhancedButton
                onClick={handleAddCandidate}
                disabled={loading || !selectedElection}
                loading={loading}
                variant="primary"
                className="w-full"
              >
                {loading ? "Adding..." : "Add Candidate"}
              </EnhancedButton>
            </div>
          </div>
        </div>
      </div>

      {/* HOD Created Elections - Small Compact Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-bold text-gray-600 uppercase mb-3">Your Created Elections</div>
        
        {departmentElections.length === 0 && classElections.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-6">
            <div className="text-4xl mb-2">🗳️</div>
            <div className="font-medium text-gray-700 mb-1">No elections found</div>
            <div className="text-xs text-gray-500">
              {elections.length === 0 
                ? "No elections exist in your department yet. Create your first election above!"
                : "No elections match your department. Contact admin if this seems incorrect."
              }
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Department Elections */}
            {departmentElections.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Department Elections</div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Title</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Candidates</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentElections.map((election) => {
                        const status = getElectionStatus(election);
                        return (
                          <tr key={election._id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-900">{election.title}</td>
                            <td className="py-2 px-3 text-gray-600">{election.candidateCount || 0}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                {status.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Class Elections */}
            {classElections.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Class Elections</div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Title</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Class</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Candidates</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classElections.map((election) => {
                        const status = getElectionStatus(election);
                        return (
                          <tr key={election._id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-900">{election.title}</td>
                            <td className="py-2 px-3 text-gray-600">{election.class?.name || "N/A"}</td>
                            <td className="py-2 px-3 text-gray-600">{election.candidateCount || 0}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                {status.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminMobileShell>
  );
}
