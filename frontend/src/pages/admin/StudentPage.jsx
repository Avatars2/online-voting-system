import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import EnhancedButton from "../../components/UI/EnhancedButton";
import EnhancedInput from "../../components/UI/EnhancedInput";

export default function StudentPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    studentId: "",
    phone: "",
    department: "",
    class: "",
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
    } catch (err) {
      console.error("Failed to load students:", err);
      setToast({ type: "error", message: "Failed to load students" });
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
      department: student.department?._id || "",
      class: student.class?._id || "",
    });
  };

  const handleSaveEdit = async () => {
    try {
      if (!editForm.name.trim() || !editForm.email.trim()) {
        setToast({ type: "error", message: "Name and email are required" });
        return;
      }

      const updateData = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        studentId: editForm.studentId.trim(),
        phone: editForm.phone.trim(),
        department: editForm.department || undefined,
        class: editForm.class || undefined,
      };

      await adminAPI.students.update(editingId, updateData);
      setToast({ type: "success", message: "Student updated successfully" });
      setEditingId(null);
      await loadStudents();
    } catch (err) {
      console.error("Failed to update student:", err);
      const errorMsg = err.response?.data?.error || "Failed to update student";
      setToast({ type: "error", message: errorMsg });
    }
  };

  const handleDelete = async (studentId) => {
    try {
      await adminAPI.students.delete(studentId);
      setToast({ type: "success", message: "Student deleted successfully" });
      setShowDeleteConfirm(null);
      await loadStudents();
    } catch (err) {
      console.error("Failed to delete student:", err);
      const errorMsg = err.response?.data?.error || "Failed to delete student";
      setToast({ type: "error", message: errorMsg });
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="admin-page">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white z-50 ${
          toast.type === 'error' ? 'bg-red-500' :
          toast.type === 'success' ? 'bg-green-500' :
          'bg-blue-500'
        }`}>
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-4 font-bold hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      <div className="page-header mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Students</h1>
        <p className="text-gray-600">View, edit, and delete student information</p>
      </div>

      <div className="search-bar mb-6">
        <div className="flex gap-3 items-center">
          <EnhancedInput
            type="text"
            placeholder="Search by name, email, or student ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon="🔍"
          />
          <span className="result-count text-sm text-gray-600 whitespace-nowrap">{filteredStudents.length} of {students.length} students</span>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading students...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="empty-state">
          <p>
            {searchTerm
              ? "No students match your search"
              : "No students registered yet"}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="students-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Student ID</th>
                <th>Department</th>
                <th>Class</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student._id}>
                  {editingId === student._id ? (
                    <>
                      <td>
                        <EnhancedInput
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          placeholder="Name"
                        />
                      </td>
                      <td>
                        <EnhancedInput
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                          placeholder="Email"
                        />
                      </td>
                      <td>
                        <EnhancedInput
                          type="text"
                          value={editForm.studentId}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              studentId: e.target.value,
                            })
                          }
                          placeholder="Student ID"
                        />
                      </td>
                      <td>
                        <span>{student.department?.name || "N/A"}</span>
                      </td>
                      <td>
                        <span>{student.class?.name || "N/A"}</span>
                      </td>
                      <td>
                        <EnhancedInput
                          type="text"
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm({ ...editForm, phone: e.target.value })
                          }
                          placeholder="Phone"
                        />
                      </td>
                      <td>
                        <div className="action-buttons">
                          <EnhancedButton
                            onClick={handleSaveEdit}
                            variant="primary"
                            size="small"
                          >
                            Save
                          </EnhancedButton>
                          <EnhancedButton
                            onClick={() => setEditingId(null)}
                            variant="secondary"
                            size="small"
                          >
                            Cancel
                          </EnhancedButton>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.studentId || "N/A"}</td>
                      <td>{student.department?.name || "N/A"}</td>
                      <td>{student.class?.name || "N/A"}</td>
                      <td>{student.phone || "N/A"}</td>
                      <td>
                        <div className="action-buttons">
                          <EnhancedButton
                            onClick={() => handleEdit(student)}
                            variant="secondary"
                            size="small"
                          >
                            Edit
                          </EnhancedButton>
                          <EnhancedButton
                            onClick={() => setShowDeleteConfirm(student._id)}
                            variant="danger"
                            size="small"
                          >
                            Delete
                          </EnhancedButton>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Student?</h3>
            <p>
              This action cannot be undone. The student will be permanently
              removed from the system.
            </p>
            <div className="modal-buttons">
              <EnhancedButton
                onClick={() => setShowDeleteConfirm(null)}
                variant="secondary"
              >
                Cancel
              </EnhancedButton>
              <EnhancedButton
                onClick={() => handleDelete(showDeleteConfirm)}
                variant="danger"
              >
                Delete
              </EnhancedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
