import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function HODClassManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [department, setDepartment] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states matching admin ClassPage
  const [className, setClassName] = useState("");
  const [year, setYear] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [registerTeacher, setRegisterTeacher] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError("");
      const userResponse = await authAPI.verifyToken();
      setUser(userResponse.data);

      if (userResponse.data.assignedDepartment) {
        const [deptResponse, classesResponse] = await Promise.all([
          adminAPI.getDepartment(userResponse.data.assignedDepartment),
          adminAPI.classes.list(userResponse.data.assignedDepartment)
        ]);
        setDepartment(deptResponse.data);
        setClasses(classesResponse.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load data");
      setClasses([]);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    if (!className.trim()) {
      setError("Class name is required");
      return;
    }
    if (!department) {
      setError("Department information not available");
      return;
    }
    if (registerTeacher && (!teacherEmail.trim() || !teacherPassword.trim())) {
      setError("Teacher email and password are required when registering teacher");
      return;
    }
    if (registerTeacher && !teacherEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const payload = { 
        name: className.trim(), 
        department: department._id,
        year: year.trim() || undefined
      };
      
      if (registerTeacher) {
        payload.teacherEmail = teacherEmail.trim();
        payload.teacherPassword = teacherPassword;
        payload.teacherPhone = teacherPhone.trim();
        payload.teacher = teacherName.trim() || `Teacher of ${className.trim()}`;
      }
      
      await adminAPI.classes.create(payload);
      
      // Reset form
      setClassName("");
      setYear("");
      setTeacherName("");
      setTeacherEmail("");
      setTeacherPassword("");
      setTeacherPhone("");
      setRegisterTeacher(false);
      
      // Refresh classes list
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  if (!department) {
    return (
      <AdminMobileShell
        title="Class Management"
        subtitle="Create and view classes"
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
      title="Class Management"
      subtitle={`${department.name} Classes`}
      headerColor="bg-gradient-to-r from-green-600 to-teal-700"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Add Class</div>
        <div className="space-y-3">
          {/* Department Info (readonly for HOD) */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-600">Department</div>
            <div className="font-medium text-gray-900">{department.name}</div>
          </div>
          
          <input
            type="text"
            className="input-base"
            placeholder="Class name (e.g., CS-A)"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            disabled={loading}
          />
          <input
            type="text"
            className="input-base"
            placeholder="Year (e.g., 1st Year)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={loading}
          />
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="registerTeacher"
              checked={registerTeacher}
              onChange={(e) => setRegisterTeacher(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="registerTeacher" className="text-sm font-medium text-gray-700">
              Register Teacher for this class
            </label>
          </div>

          {registerTeacher && (
            <>
              <input
                type="text"
                placeholder="Teacher Name (optional)"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="input-base"
                disabled={loading}
              />
              <input
                type="email"
                placeholder="Teacher Email (required)"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                className="input-base"
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Teacher Password (required)"
                value={teacherPassword}
                onChange={(e) => setTeacherPassword(e.target.value)}
                className="input-base"
                disabled={loading}
              />
              <input
                type="tel"
                placeholder="Teacher Phone (optional)"
                value={teacherPhone}
                onChange={(e) => setTeacherPhone(e.target.value)}
                className="input-base"
                disabled={loading}
              />
            </>
          )}
          
          <button onClick={handleAdd} className="btn-primary w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Class"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-gray-900">Classes</div>
          <div className="text-xs font-semibold text-gray-500">{classes.length} TOTAL</div>
        </div>
        <div className="space-y-2">
          {classes.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center text-gray-600">
              No classes yet
            </div>
          ) : (
            classes.map((cls) => (
              <div key={cls._id} className="p-4 border rounded-xl bg-white">
                <div className="font-semibold text-gray-900">{cls.name}</div>
                {cls.year && (
                  <div className="text-sm text-gray-500 mt-1">{cls.year}</div>
                )}
                <div className="text-sm text-gray-600 mt-1">
                  Teacher: {cls.classTeacher?.name || "Pending"}
                </div>
                {cls.classTeacher?.email && (
                  <div className="text-xs text-gray-500 mt-1">{cls.classTeacher.email}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Back to Department Button */}
      <div className="mt-4">
        <button
          onClick={() => navigate("/hod/department")}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
        >
          Back to Department
        </button>
      </div>
    </AdminMobileShell>
  );
}
