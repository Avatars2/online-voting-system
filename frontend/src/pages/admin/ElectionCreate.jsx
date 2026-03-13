import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import EnhancedInput from "../../components/UI/EnhancedInput";
import EnhancedButton from "../../components/UI/EnhancedButton";
import { useToast } from "../../components/UI/Toast";

export default function ElectionCreate() {
  const { success, error: showError } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    level: "global",
    department: "",
    class: "",
  });
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  const [candidates, setCandidates] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(false);
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

  const fetchElections = async () => {
    try {
      const res = await adminAPI.elections.list();
      setElections(res.data || []);
    } catch {
      setElections([]);
    }
  };

  const fetchMeta = async () => {
    try {
      const [deptRes, studentRes] = await Promise.all([
        adminAPI.departments.list(),
        adminAPI.students.list(),
      ]);
      setDepartments(deptRes.data || []);
      setStudents(studentRes.data || []);
    } catch {
      setDepartments([]);
      setStudents([]);
    }
  };

  useEffect(() => {
    fetchElections();
    fetchMeta();
  }, []);

  useEffect(() => {
    const loadClasses = async () => {
      if (!formData.department) {
        setClasses([]);
        return;
      }
      try {
        const res = await adminAPI.classes.list(formData.department);
        setClasses(res.data || []);
      } catch {
        setClasses([]);
      }
    };
    loadClasses();
  }, [formData.department]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "level") {
        next.department = "";
        next.class = "";
      }
      if (name === "department") {
        next.class = "";
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      showError("Election title is required");
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
      if (formData.level === "department") payload.department = formData.department;
      if (formData.level === "class") payload.class = formData.class;
      
      await adminAPI.elections.create(payload);
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        level: "global",
        department: "",
        class: "",
      });
      
      success('Election created successfully!');
      fetchElections();
    } catch (err) {
      showError(err.response?.data?.error || "Failed to create election");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async () => {
    if (!selectedElection || !selectedStudent) {
      showError("Select an election and student");
      return;
    }
    setLoading(true);
    try {
      await adminAPI.addCandidate(selectedElection, {
        userId: selectedStudent,
        position: "Candidate", // Fixed position
      });
      setSelectedStudent("");
      setStudentSearch("");
      success("Candidate added successfully!");
      fetchElections();
    } catch (err) {
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

  // Filter elections by level and sort by status
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

  const globalElections = getSortedElections(elections.filter(e => !e.level || e.level === "global"));
  const departmentElections = getSortedElections(elections.filter(e => e.level === "department"));
  const classElections = getSortedElections(elections.filter(e => e.level === "class"));

  // Get status for each election
  const getElectionStatus = (election) => {
    const now = new Date();
    const startDate = election.startDate ? new Date(election.startDate) : null;
    const endDate = election.endDate ? new Date(election.endDate) : null;
    
    if (startDate && startDate > now) return { text: "Upcoming", color: "text-blue-700 bg-blue-50" };
    if (endDate && endDate < now) return { text: "Ended", color: "text-gray-700 bg-gray-50" };
    return { text: "Active", color: "text-green-700 bg-green-50" };
  };

  return (
    <AdminMobileShell
      title="Election Hub"
      subtitle="Live polling & governance"
      headerColor="bg-gradient-to-r from-indigo-600 to-purple-700"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="text-sm font-bold text-gray-600 uppercase mb-3">Create New Election</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Election Level</label>
            <select
              className="input-base"
              name="level"
              value={formData.level}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="global">All College (Global)</option>
              <option value="department">Specific Department</option>
              <option value="class">Specific Class</option>
            </select>
          </div>

          {formData.level === "department" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                className="input-base"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
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
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                <select
                  className="input-base"
                  name="class"
                  value={formData.class}
                  onChange={handleChange}
                  disabled={loading || !formData.department}
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
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
              name="title"
              value={formData.title}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <EnhancedInput
              type="textarea"
              placeholder="Election description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <EnhancedInput
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                disabled={loading}
                min={getMinDateTime()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <EnhancedInput
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                disabled={loading}
                min={formData.startDate || getMinDateTime()}
              />
            </div>
          </div>
          
          <EnhancedButton
            onClick={handleCreate}
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

      {/* No Elections Message */}
      {elections.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-gray-500 text-sm text-center py-8">No elections created yet</div>
        </div>
      )}

      {/* Global Elections Table */}
      {globalElections.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="text-sm font-bold text-gray-600 uppercase mb-3">Global Elections</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Title</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Candidates</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Start Date</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">End Date</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {globalElections.map((election) => {
                  const status = getElectionStatus(election);
                  const startDate = election.startDate ? new Date(election.startDate) : null;
                  const endDate = election.endDate ? new Date(election.endDate) : null;
                  
                  return (
                    <tr key={election._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-900">{election.title}</td>
                      <td className="py-2 px-2 text-gray-600">{election.candidateCount || 0} candidates</td>
                      <td className="py-2 px-2 text-gray-600">
                        {startDate ? startDate.toLocaleDateString() : "Not set"}
                      </td>
                      <td className="py-2 px-2 text-gray-600">
                        {endDate ? endDate.toLocaleDateString() : "Not set"}
                      </td>
                      <td className="py-2 px-2">
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

      {/* Department Elections Table */}
      {departmentElections.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="text-sm font-bold text-gray-600 uppercase mb-3">Department Elections</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Title</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Department</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Candidates</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Start Date</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">End Date</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {departmentElections.map((election) => {
                  const status = getElectionStatus(election);
                  const startDate = election.startDate ? new Date(election.startDate) : null;
                  const endDate = election.endDate ? new Date(election.endDate) : null;
                  
                  return (
                    <tr key={election._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-900">{election.title}</td>
                      <td className="py-2 px-2 text-gray-600">{election.department?.name || "N/A"}</td>
                      <td className="py-2 px-2 text-gray-600">{election.candidateCount || 0} candidates</td>
                      <td className="py-2 px-2 text-gray-600">
                        {startDate ? startDate.toLocaleDateString() : "Not set"}
                      </td>
                      <td className="py-2 px-2 text-gray-600">
                        {endDate ? endDate.toLocaleDateString() : "Not set"}
                      </td>
                      <td className="py-2 px-2">
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

      {/* Class Elections Table */}
      {classElections.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm font-bold text-gray-600 uppercase mb-3">Class Elections</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Title</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Class</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Candidates</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Start Date</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">End Date</th>
                  <th className="text-left py-2 px-2 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {classElections.map((election) => {
                  const status = getElectionStatus(election);
                  const startDate = election.startDate ? new Date(election.startDate) : null;
                  const endDate = election.endDate ? new Date(election.endDate) : null;
                  
                  return (
                    <tr key={election._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-900">{election.title}</td>
                      <td className="py-2 px-2 text-gray-600">{election.class?.name || "N/A"}</td>
                      <td className="py-2 px-2 text-gray-600">{election.candidateCount || 0} candidates</td>
                      <td className="py-2 px-2 text-gray-600">
                        {startDate ? startDate.toLocaleDateString() : "Not set"}
                      </td>
                      <td className="py-2 px-2 text-gray-600">
                        {endDate ? endDate.toLocaleDateString() : "Not set"}
                      </td>
                      <td className="py-2 px-2">
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

      {/* No Elections Message */}
      {elections.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-gray-500 text-sm text-center py-8">No elections created yet</div>
        </div>
      )}
    </AdminMobileShell>
  );
}
