import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, hodAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function HODStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await hodAPI.students.list();
        console.log("HOD students fetched:", response.data);
        setStudents(response.data || []);
      } catch (err) {
        console.error("Failed to fetch HOD students:", err);
        setError(err.response?.data?.error || "Failed to load students");
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      await hodAPI.students.delete(studentId);
      console.log(`Student ${studentName} deleted successfully`);
      
      // Refresh the students list
      const response = await hodAPI.students.list();
      setStudents(response.data || []);
    } catch (err) {
      console.error("Failed to delete student:", err);
      setError(err.response?.data?.error || "Failed to delete student");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminMobileShell title="Students" subtitle="Loading..." backTo="/hod/dashboard">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell title="Students" subtitle={`${students.length} students in your department`} backTo="/hod/dashboard">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <input
          type="text"
          placeholder="Search students by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-base w-full"
        />
      </div>

      {/* Students List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-gray-900">Department Students</div>
          <div className="text-xs font-semibold text-gray-500">{filteredStudents.length} FOUND</div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-gray-500 text-sm">
              {searchTerm ? "No students found matching your search" : "No students in your department yet"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {searchTerm ? "Try a different search term" : "Register students to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <div key={student._id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{student.name}</h3>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-600">
                        📧 {student.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        🆔 {student.studentId || "N/A"}
                      </p>
                      {student.class && (
                        <p className="text-sm text-gray-600">
                          📚 {student.class.name || "Class"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      Active
                    </span>
                    <button
                      onClick={() => handleDeleteStudent(student._id, student.name)}
                      disabled={deleteLoading}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteLoading ? "..." : "🗑️ Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminMobileShell>
  );
}
