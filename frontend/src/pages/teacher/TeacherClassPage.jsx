import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function TeacherClassPage() {
  const navigate = useNavigate();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showRegisterStudent, setShowRegisterStudent] = useState(false);

  // Form data for registering student
  const [studentFormData, setStudentFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    year: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await authAPI.verifyToken();
        
        if (userResponse.data.assignedClass) {
          const classResponse = await adminAPI.getClass(userResponse.data.assignedClass);
          setClassData(classResponse.data);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load class data");
      }
    };

    fetchData();
  }, []);

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!studentFormData.name.trim()) {
      setError("Student name is required");
      return;
    }
    if (!studentFormData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!studentFormData.email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!studentFormData.password) {
      setError("Password is required");
      return;
    }
    if (studentFormData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      setLoading(true);
      
      const studentData = {
        name: studentFormData.name.trim(),
        email: studentFormData.email.trim().toLowerCase(),
        password: studentFormData.password,
        phone: studentFormData.phone.trim(),
        class: classData._id,
        department: classData.department._id,
        year: studentFormData.year.trim() || undefined
      };

      await adminAPI.students.create(studentData);

      setSuccess("Student registered successfully!");
      setStudentFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        year: ""
      });
      setShowRegisterStudent(false);
      
      // Refresh class data to get updated student count
      const classResponse = await adminAPI.getClass(classData._id);
      setClassData(classResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to register student");
    } finally {
      setLoading(false);
    }
  };

  if (!classData) {
    return (
      <AdminMobileShell title="Class Details" subtitle="Class Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell title="Class Details" subtitle={`${classData.name} Management`}>
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200">
          {success}
        </div>
      )}

      {/* Class Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Class Information</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Class Name:</span>
            <span className="text-sm font-medium">{classData.name}</span>
          </div>
          {classData.year && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Year:</span>
              <span className="text-sm font-medium">{classData.year}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Department:</span>
            <span className="text-sm font-medium">{classData.department?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Class Teacher:</span>
            <span className="text-sm font-medium">{classData.classTeacher?.name || "You"}</span>
          </div>
        </div>
      </div>

      {/* Students Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Class Students</div>
          <div className="text-xs font-semibold text-gray-500">0 Students</div>
        </div>
        <div className="space-y-2">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center text-gray-600">
            Student list will be available here
          </div>
        </div>
      </div>

      {/* Register Student Button */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <button
          onClick={() => setShowRegisterStudent(true)}
          className="btn-primary w-full"
        >
          Register New Student
        </button>
      </div>

      {/* Register Student Modal */}
      {showRegisterStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 w-full max-w-md">
            <div className="font-bold text-gray-900 mb-3">Register Student</div>
            <form onSubmit={handleRegisterStudent} className="space-y-3">
              <input
                type="text"
                placeholder="Student Name"
                value={studentFormData.name}
                onChange={(e) => setStudentFormData({...studentFormData, name: e.target.value})}
                className="input-base"
                required
              />
              <input
                type="email"
                placeholder="Student Email"
                value={studentFormData.email}
                onChange={(e) => setStudentFormData({...studentFormData, email: e.target.value})}
                className="input-base"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={studentFormData.password}
                onChange={(e) => setStudentFormData({...studentFormData, password: e.target.value})}
                className="input-base"
                required
              />
              <input
                type="tel"
                placeholder="Phone Number (optional)"
                value={studentFormData.phone}
                onChange={(e) => setStudentFormData({...studentFormData, phone: e.target.value})}
                className="input-base"
              />
              <input
                type="text"
                placeholder="Year (optional)"
                value={studentFormData.year}
                onChange={(e) => setStudentFormData({...studentFormData, year: e.target.value})}
                className="input-base"
              />
              
              <div className="flex space-x-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Registering..." : "Register Student"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegisterStudent(false)}
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate("/teacher/dashboard")}
        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
      >
        Back to Dashboard
      </button>
    </AdminMobileShell>
  );
}
