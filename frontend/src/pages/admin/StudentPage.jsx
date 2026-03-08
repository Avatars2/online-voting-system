import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function StudentPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    studentId: "",
    phone: "",
  });

  // Fetch students on mount
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.students.list();
      setStudents(response.data || []);
      setError("");
    } catch (err) {
      console.error("Failed to load students:", err);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student) => {
    setEditingId(student._id);
    setEditForm({
      name: student.name || "",
      email: student.email || "",
      studentId: student.studentId || "",
      phone: student.phone || "",
    });
  };

  const handleSaveEdit = async () => {
    try {
      if (!editForm.name.trim() || !editForm.email.trim()) {
        setError("Name and email are required");
        return;
      }

      await adminAPI.students.update(editingId, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        studentId: editForm.studentId.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
      });

      setError("");
      setEditingId(null);
      await loadStudents();
    } catch (err) {
      console.error("Failed to update student:", err);
      setError(err.response?.data?.error || "Failed to update student");
    }
  };

  const handleDelete = async (studentId) => {
    try {
      await adminAPI.students.delete(studentId);
      setError("");
      setShowDeleteConfirm(null);
      await loadStudents();
    } catch (err) {
      console.error("Failed to delete student:", err);
      setError(err.response?.data?.error || "Failed to delete student");
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <AdminMobileShell title="Students" subtitle="Loading...">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell
      title="Students"
      subtitle={`${students.length} registered students`}
      headerColor="bg-gradient-to-r from-indigo-600 to-purple-700"
    >
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or student ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-600 mt-2">
          {filteredStudents.length} of {students.length} students
        </p>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-gray-500">
            {searchTerm ? "No students match your search" : "No students registered yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((student) =>
            editingId === student._id ? (
              <div key={student._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Name"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Email"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={editForm.studentId}
                    onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                    placeholder="Student ID"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="Phone"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={student._id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{student.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{student.email}</p>
                    {student.studentId && (
                      <p className="text-xs text-gray-500 mt-1">ID: {student.studentId}</p>
                    )}
                    {student.department && (
                      <p className="text-xs text-gray-500 mt-1">
                        {student.department.name}
                        {student.class && ` • ${student.class.name}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(student)}
                      className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-xs font-medium whitespace-nowrap"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(student._id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium whitespace-nowrap"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Student?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. The student will be permanently removed from the system.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}
