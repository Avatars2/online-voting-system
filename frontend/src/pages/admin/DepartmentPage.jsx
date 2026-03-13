import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function DepartmentPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [name, setName] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");

  const fetch = () => {
    adminAPI.departments.list().then((r) => {
      console.log("Departments fetched:", r.data);
      setDepartments(r.data || []);
    }).catch(() => setDepartments([]));
  };
  useEffect(() => fetch(), []);

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Department name is required");
      return;
    }

    setLoading(true);
    setError("");
    
    const payload = { name: name.trim() };
    
    adminAPI.departments
      .create(payload)
      .then((response) => {
        console.log("Department creation response:", response);
        const deptName = name.trim();
        setName("");
        fetch();
        success(`Department "${deptName}" created successfully!`);
      })
      .catch((err) => {
        console.error("Department creation error:", err);
        console.error("Error response:", err.response);
        const errorMessage = err.response?.data?.error || "Failed to create department";
        setError(errorMessage);
        showError(errorMessage);
      })
      .finally(() => setLoading(false));
  };

  const handleDeleteDepartment = async (departmentId, departmentName) => {
    if (!window.confirm(`Are you sure you want to delete "${departmentName}"? This action cannot be undone and will also remove all associated data.`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      await adminAPI.departments.delete(departmentId);
      console.log(`Department ${departmentName} deleted successfully`);
      success(`Department "${departmentName}" deleted successfully!`);
      
      // Refresh the departments list
      fetch();
    } catch (err) {
      console.error("Failed to delete department:", err);
      const errorMessage = err.response?.data?.error || "Failed to delete department";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRegisterHod = () => {
    navigate("/hod/register");
  };

  return (
    <AdminMobileShell
      title="Departments"
      subtitle="Institutional structure"
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">New Department</div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Department Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base"
            disabled={loading}
          />
          
          <button onClick={handleCreate} disabled={loading} className="btn-primary w-full">
            {loading ? "Creating..." : "Create Department"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Active Departments</div>
          <div className="text-xs font-semibold text-gray-500">{departments.length} TOTAL</div>
        </div>
        <div className="space-y-2">
          {departments.map((d) => (
            <div 
              key={d._id} 
              className="bg-white border rounded-xl p-4 hover:bg-gray-50 hover:border-blue-200 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/departments/${d._id}`)}>
                  <p className="font-semibold text-gray-900">{d.name}</p>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      HOD: <span className="font-medium text-gray-900">
                        {d.hod?.name || "Not assigned"}
                      </span>
                    </p>
                    {d.hod?.email && (
                      <p className="text-xs text-gray-500 mt-1">{d.hod.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-blue-600 cursor-pointer" onClick={() => navigate(`/departments/${d._id}`)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDepartment(d._id, d.name);
                    }}
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
        
        {departments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleRegisterHod}
              className="w-full p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium hover:bg-green-100 transition"
            >
              Register New HOD
            </button>
          </div>
        )}
      </div>
    </AdminMobileShell>
  );
}
