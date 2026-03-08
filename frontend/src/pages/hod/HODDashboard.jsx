import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function HODDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await authAPI.verifyToken();
        setUser(userResponse.data);
        
        // Get all departments and filter where this HOD is registered
        const deptsResponse = await adminAPI.departments.list();
        const allDepartments = deptsResponse.data || [];
        
        // Filter departments where this HOD is the assigned HOD
        const hodDepartments = allDepartments.filter(dept => 
          dept.hod && dept.hod._id === userResponse.data._id
        );
        
        setDepartments(hodDepartments);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load departments");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDepartmentClick = (department) => {
    navigate(`/hod/department/${department._id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <AdminMobileShell title="HOD Dashboard" subtitle={`${departments.length} Department${departments.length !== 1 ? 's' : ''} Assigned to You`}>
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Small Department Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-gray-900">Your Departments</div>
          <div className="text-xs font-semibold text-gray-500">{departments.length} TOTAL</div>
        </div>
        
        {departments.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-lg font-medium">No Departments Assigned</p>
              <p className="text-sm">You are not registered as HOD for any department yet.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {departments.map((department, index) => (
              <div 
                key={department._id}
                className="p-4 border rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => handleDepartmentClick(department)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{department.name}</h3>
                    <div className="flex items-center mt-1 space-x-4">
                      <span className="text-xs text-gray-500">
                        ID: {department._id.slice(-8)}
                      </span>
                      <span className="text-xs text-green-600 font-medium">
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDepartmentClick(department);
                      }}
                      className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                    >
                      View →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-bold text-gray-600 uppercase mb-3">Quick Actions</div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/hod/notices")}
            className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
          >
            <span className="text-2xl block mb-1">📢</span>
            <span className="text-xs font-medium text-gray-700">Notices</span>
          </button>
          <button
            onClick={() => navigate("/hod/elections")}
            className="p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors text-center"
          >
            <span className="text-2xl block mb-1">🗳️</span>
            <span className="text-xs font-medium text-gray-700">Elections</span>
          </button>
          <button
            onClick={() => navigate("/hod/results")}
            className="p-3 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors text-center"
          >
            <span className="text-2xl block mb-1">📊</span>
            <span className="text-xs font-medium text-gray-700">Results</span>
          </button>
          <button
            onClick={() => navigate("/hod/profile")}
            className="p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-center"
          >
            <span className="text-2xl block mb-1">👤</span>
            <span className="text-xs font-medium text-gray-700">Profile</span>
          </button>
        </div>
      </div>
    </AdminMobileShell>
  );
}
