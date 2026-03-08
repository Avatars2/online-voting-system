import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function HODDepartment() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const userResponse = await authAPI.verifyToken();
        setUser(userResponse.data);

        // Get departments assigned to this HOD
        if (userResponse.data.assignedDepartment) {
          // If HOD has single assigned department (same logic as HODDashboard)
          const deptResponse = await adminAPI.getDepartment(userResponse.data.assignedDepartment);
          setDepartments([deptResponse.data]);
        } else {
          // Fallback: try to get all departments (for admin HODs or if no assigned department)
          try {
            const allDeptsResponse = await adminAPI.departments.list();
            setDepartments(allDeptsResponse.data || []);
          } catch (fallbackErr) {
            console.log("Could not load all departments:", fallbackErr);
            setDepartments([]);
          }
        }
      } catch (err) {
        console.error("Department loading error:", err);
        setError(err.response?.data?.error || "Failed to load departments");
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <AdminMobileShell
        title="My Departments"
        subtitle="View assigned departments"
        headerColor="bg-gradient-to-r from-green-600 to-teal-700"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading departments...</div>
        </div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell
      title="My Departments"
      subtitle={`${departments.length} Assigned Department${departments.length !== 1 ? 's' : ''}`}
      headerColor="bg-gradient-to-r from-green-600 to-teal-700"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm mb-4">
          {error}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs">Debug Info</summary>
            <div className="mt-1 text-xs">
              <div>User Role: {user?.role || 'Unknown'}</div>
              <div>Assigned Department: {user?.assignedDepartment || 'None'}</div>
              <div>Departments Loaded: {departments.length}</div>
            </div>
          </details>
        </div>
      )}

      {/* Departments List */}
      <div className="space-y-3">
        {departments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="text-gray-500 mb-4">No departments assigned yet</div>
            {user && (
              <div className="text-xs text-gray-400 space-y-1">
                <div>Logged in as: {user.name || user.email}</div>
                <div>Role: {user.role}</div>
                <div>Assigned Department: {user.assignedDepartment || 'None'}</div>
              </div>
            )}
          </div>
        ) : (
          departments.map((department) => (
            <div
              key={department._id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-green-300 hover:shadow-md transition cursor-pointer"
              onClick={() => navigate(`/hod/department/${department._id}`)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{department.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    HOD: {department.hod?.name || "You"}
                  </p>
                  {department.hod?.email && (
                    <p className="text-xs text-gray-500 mt-1">{department.hod.email}</p>
                  )}
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                  Assigned
                </div>
              </div>

              {/* Department Stats */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-600">Total Classes</div>
                  <div className="font-semibold text-gray-900">{department.classCount || 0}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-600">Total Students</div>
                  <div className="font-semibold text-gray-900">{department.studentCount || 0}</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/hod/department/${department._id}/classes`);
                  }}
                  className="flex-1 p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs font-medium hover:bg-green-100 transition"
                >
                  Manage Classes
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/hod/register-student`);
                  }}
                  className="flex-1 p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs font-medium hover:bg-blue-100 transition"
                >
                  Add Student
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/hod/notices`);
                  }}
                  className="flex-1 p-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 text-xs font-medium hover:bg-purple-100 transition"
                >
                  Notices
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Stats Summary */}
      {departments.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mt-4">
          <div className="font-bold text-gray-900 mb-3">Summary</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{departments.length}</div>
              <div className="text-xs text-gray-600">Departments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {departments.reduce((sum, dept) => sum + (dept.classCount || 0), 0)}
              </div>
              <div className="text-xs text-gray-600">Total Classes</div>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-4">
        <button
          onClick={() => navigate("/hod/dashboard")}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
        >
          Back to Dashboard
        </button>
      </div>
    </AdminMobileShell>
  );
}
