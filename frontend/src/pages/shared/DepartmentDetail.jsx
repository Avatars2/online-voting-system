import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminAPI, hodAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function DepartmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { success, error: showError } = useToast();
  const [dept, setDept] = useState(null);
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    assignedClass: ""
  });

  useEffect(() => {
    // Get user role from localStorage
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "");

    if (!id) return;
    
    // Get department details based on user role
    const fetchDepartment = async () => {
      try {
        let response;
        
        if (user.role === "admin") {
          // Admin uses adminAPI to get department
          response = await adminAPI.getDepartment(id);
          setDept(response.data);
          
          // Get classes for this department
          const classesResponse = await adminAPI.classes.list(id);
          setClasses(classesResponse.data || []);
        } else if (user.role === "hod") {
          // HOD uses hodAPI to get department (HOD-specific permissions)
          const deptsResponse = await hodAPI.getDepartment();
          const allDepartments = deptsResponse.data || [];
          const department = allDepartments.find(d => d._id === id);
          setDept(department);
          
          // HOD uses hodAPI to get classes in their department
          const classesResponse = await hodAPI.classes.list();
          setClasses(classesResponse.data || []);
        }
      } catch (err) {
        console.error("Failed to load department:", err);
        setError(err.response?.data?.error || "Failed to load department");
      }
    };

    fetchDepartment();
  }, [id]);

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Are you sure you want to delete class "${className}"? This action cannot be undone and will also remove all associated students and data.`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      // Use appropriate API based on user role
      const apiCall = userRole === "admin" ? adminAPI.classes.delete(classId) : hodAPI.classes.delete(classId);
      await apiCall;
      console.log(`Class ${className} deleted successfully`);
      success(`Class "${className}" deleted successfully!`);
      
      // Refresh the classes list
      if (userRole === "admin") {
        const classesResponse = await adminAPI.classes.list(id);
        setClasses(classesResponse.data || []);
      } else {
        const classesResponse = await hodAPI.classes.list();
        setClasses(classesResponse.data || []);
      }
    } catch (err) {
      console.error("Failed to delete class:", err);
      const errorMessage = err.response?.data?.error || "Failed to delete class";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRegisterTeacher = async () => {
    const { name, email, password, phone, assignedClass } = teacherForm;
    
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Teacher name, email, and password are required");
      return;
    }
    
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (!assignedClass) {
      setError("Please select a class for the teacher");
      return;
    }
    
    setTeacherLoading(true);
    setError("");
    
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        phone: phone.trim() || undefined,
        classId: assignedClass,  // Backend expects classId, not assignedClass
        department: id
      };
      
      // Use appropriate API based on user role
      const apiCall = userRole === "admin" 
        ? adminAPI.teachers.register(payload) 
        : hodAPI.teachers.register(payload);
      
      await apiCall;
      success("Teacher registered successfully!");
      
      // Reset form
      setTeacherForm({
        name: "",
        email: "",
        password: "",
        phone: "",
        assignedClass: ""
      });
    } catch (err) {
      console.error("Failed to register teacher:", err);
      const errorMessage = err.response?.data?.error || "Failed to register teacher";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setTeacherLoading(false);
    }
  };

  const handleCreateClass = () => {
    if (!className.trim()) {
      setError("Class name is required");
      return;
    }
    
    setLoading(true);
    setError("");
    
    const payload = { 
      name: className.trim(), 
      department: id,
      year: year.trim() || undefined
    };
    
    const apiCall = userRole === "admin" ? adminAPI.classes.create(payload) : hodAPI.classes.create(payload);
    
    apiCall
      .then((response) => {
        console.log("Class created successfully:", response);
        setClassName("");
        setYear("");
        
        success("Class created successfully!");
        
        // Force refresh after a short delay to ensure backend sync
        setTimeout(() => {
          if (userRole === "admin") {
            // Admin uses adminAPI
            adminAPI.classes.list(id).then((r) => {
              const deptClasses = r.data || [];
              console.log("Force refreshed classes:", deptClasses);
              setClasses(deptClasses);
            });
          } else {
            // HOD uses hodAPI
            hodAPI.classes.list().then((r) => {
              console.log("Force refreshed classes:", r.data);
              setClasses(r.data || []);
            });
          }
        }, 1000);
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
      backTo={userRole === "admin" ? "/admin/departments" : "/hod/dashboard"}
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
            <div
              key={c._id}
              className="w-full p-4 border rounded-xl hover:border-blue-300 hover:bg-blue-50 transition"
            >
              <div className="flex justify-between items-start">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(userRole === "admin" ? `/admin/classes/${c._id}` : `/hod/classes/${c._id}`)}
                >
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{c.year || "—"}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Teacher: {c.classTeacher?.name || "Pending"}
                  </p>
                  {c.classTeacher?.email && (
                    <p className="text-xs text-gray-500 mt-1">{c.classTeacher.email}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-blue-600 cursor-pointer" onClick={() => navigate(userRole === "admin" ? `/admin/classes/${c._id}` : `/hod/classes/${c._id}`)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClass(c._id, c.name);
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
      </div>

      {/* Teacher Registration Section */}
      {classes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="font-bold text-gray-900 mb-3">Register New Teacher</div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Teacher Name"
              value={teacherForm.name}
              onChange={(e) => setTeacherForm(prev => ({ ...prev, name: e.target.value }))}
              className="input-base"
              disabled={teacherLoading}
            />
            <input
              type="email"
              placeholder="Teacher Email"
              value={teacherForm.email}
              onChange={(e) => setTeacherForm(prev => ({ ...prev, email: e.target.value }))}
              className="input-base"
              disabled={teacherLoading}
            />
            <input
              type="password"
              placeholder="Teacher Password"
              value={teacherForm.password}
              onChange={(e) => setTeacherForm(prev => ({ ...prev, password: e.target.value }))}
              className="input-base"
              disabled={teacherLoading}
            />
            <input
              type="tel"
              placeholder="Teacher Phone (optional)"
              value={teacherForm.phone}
              onChange={(e) => setTeacherForm(prev => ({ ...prev, phone: e.target.value }))}
              className="input-base"
              disabled={teacherLoading}
            />
            <select
              value={teacherForm.assignedClass}
              onChange={(e) => setTeacherForm(prev => ({ ...prev, assignedClass: e.target.value }))}
              className="input-base"
              disabled={teacherLoading}
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} {cls.year && `(${cls.year})`}
                </option>
              ))}
            </select>
            
            <button 
              onClick={handleRegisterTeacher} 
              disabled={teacherLoading} 
              className="btn-primary w-full"
            >
              {teacherLoading ? "Registering..." : "Register Teacher"}
            </button>
          </div>
        </div>
      )}
    </AdminMobileShell>
  );
}
