import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function HODStudentRegister() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    class: "",
    year: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user info
        const userResponse = await authAPI.verifyToken();
        setUser(userResponse.data);

        // Get classes for HOD's department
        if (userResponse.data.assignedDepartment) {
          const classesResponse = await adminAPI.classes.list(userResponse.data.assignedDepartment);
          setClasses(classesResponse.data || []);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load data");
      }
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Student name is required");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (!formData.class) {
      setError("Please select a class");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const studentData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim(),
        class: formData.class,
        department: user.assignedDepartment,
        year: formData.year.trim() || undefined
      };

      await adminAPI.students.create(studentData);

      setSuccess("Student registered successfully!");
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        class: "",
        year: ""
      });

      setTimeout(() => {
        navigate("/hod/dashboard");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to register student");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <AdminMobileShell
        title="Register Student"
        subtitle="Add new student to department"
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
      title="Register Student"
      subtitle="Add new student to department"
      headerColor="bg-gradient-to-r from-green-600 to-teal-700"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200 mb-4">
          {success}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input-base"
              placeholder="Enter student's full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-base"
              placeholder="Enter student's email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-base"
              placeholder="Enter password for student"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 6 characters long
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input-base"
              placeholder="Enter phone number (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class *
            </label>
            <select
              name="class"
              value={formData.class}
              onChange={handleChange}
              className="input-base"
              required
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} {cls.year ? `- ${cls.year}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
              type="text"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="input-base"
              placeholder="e.g., 1st Year, 2nd Year"
            />
          </div>

          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Registering..." : "Register Student"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/hod/dashboard")}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </AdminMobileShell>
  );
}
