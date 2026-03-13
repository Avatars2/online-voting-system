import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { hodAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function HODDeptDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { success, error: showError } = useToast();
  const [dept, setDept] = useState(null);
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState("");
  const [year, setYear] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [registerTeacher, setRegisterTeacher] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    
    // Get department details using HOD API
    const fetchDepartment = async () => {
      try {
        const deptsResponse = await hodAPI.getDepartment();
        const allDepartments = deptsResponse.data || [];
        const department = allDepartments.find(d => d._id === id);
        setDept(department);
        
        // Get classes for this department
        const classesResponse = await hodAPI.classes.list();
        setClasses(classesResponse.data || []);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load department");
      }
    };

    fetchDepartment();
  }, [id]);

  const handleCreateClass = () => {
    if (!className.trim()) {
      setError("Class name is required");
      return;
    }
    
    if (registerTeacher) {
      if (!teacherEmail.trim() || !teacherPassword.trim()) {
        setError("Teacher email and password are required when registering teacher");
        return;
      }
      if (!teacherEmail.includes("@")) {
        setError("Please enter a valid email address");
        return;
      }
    }
    
    setLoading(true);
    setError("");
    
    const payload = { 
      name: className.trim(), 
      department: id,
      year: year.trim() || undefined
    };
    
    if (registerTeacher) {
      payload.teacherEmail = teacherEmail.trim();
      payload.teacherPassword = teacherPassword;
      payload.teacherPhone = teacherPhone.trim();
      payload.teacher = teacherName.trim() || `Teacher of ${className.trim()}`;
    }
    
    hodAPI.classes
      .create(payload)
      .then((response) => {
        console.log("Class created successfully:", response);
        setClassName("");
        setYear("");
        setTeacherName("");
        setTeacherEmail("");
        setTeacherPassword("");
        setTeacherPhone("");
        setRegisterTeacher(false);
        
        success("Class created successfully!");
        
        // Force refresh after a short delay to ensure backend sync
        setTimeout(() => {
          hodAPI.classes.list().then((r) => {
            console.log("Force refreshed classes:", r.data);
            setClasses(r.data || []);
          });
        }, 1000); // 1 second delay
      })
      .catch((err) => {
        const errorMessage = err.response?.data?.error || "Failed to create class";
        setError(errorMessage);
        showError(errorMessage);
      })
      .finally(() => setLoading(false));
  };

  if (!dept) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <AdminMobileShell
      title={`${dept.name}`}
      subtitle={`${dept.hod?.name || "Pending"} (HOD)`}
      headerColor="bg-gradient-to-r from-blue-600 to-indigo-700"
      backTo="/hod/dashboard"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Create New Class</div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="e.g. TY-CS (C)"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="input-base"
            disabled={loading}
          />
          <input
            type="text"
            className="input-base"
            placeholder="Year (e.g., 3rd Year)"
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
          
          <button onClick={handleCreateClass} disabled={loading} className="btn-primary w-full">
            {loading ? "Creating..." : "Create Class"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Dept Classes</div>
          <div className="text-xs font-semibold text-gray-500">{classes.length} Active</div>
        </div>
        <div className="space-y-2">
          {classes.map((c) => (
            <button
              key={c._id}
              onClick={() => navigate(`/hod/classes/${c._id}`)}
              className="w-full p-4 border rounded-xl text-left hover:border-blue-300 hover:bg-blue-50 transition"
            >
              <p className="font-semibold text-gray-900">{c.name}</p>
              <p className="text-sm text-gray-600 mt-1">{c.year || "—"}</p>
              <p className="text-sm text-gray-600 mt-1">
                Teacher: {c.classTeacher?.name || "Pending"}
              </p>
              {c.classTeacher?.email && (
                <p className="text-xs text-gray-500 mt-1">{c.classTeacher.email}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </AdminMobileShell>
  );
}
