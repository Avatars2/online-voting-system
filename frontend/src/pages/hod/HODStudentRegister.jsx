import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, hodAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import EnhancedInput from "../../components/UI/EnhancedInput";
import EnhancedButton from "../../components/UI/EnhancedButton";
import { useToast } from "../../components/UI/Toast";

export default function HODStudentRegister() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [user, setUser] = useState(null);
  const [department, setDepartment] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    enrollmentId: "",
    email: "",
    phone: "",
    tempPassword: "",
    class: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await authAPI.verifyToken();
        setUser(userResponse.data);

        // Get HOD's department
        const deptResponse = await hodAPI.getDepartment();
        const deptData = deptResponse.data;
        if (deptData && deptData.length > 0) {
          setDepartment(deptData[0]);
        }

        // Get classes for HOD's department
        const classesResponse = await hodAPI.classes.list();
        setClasses(classesResponse.data || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        tempPassword: formData.tempPassword,
        phone: formData.phone.trim() || undefined,
        enrollmentId: formData.enrollmentId.trim() || undefined,
        class: formData.class || undefined,
      };

      await hodAPI.students.register(payload);
      
      // Reset form
      setFormData({
        name: "",
        enrollmentId: "",
        email: "",
        phone: "",
        tempPassword: "",
        class: "",
      });

      success("Student registered successfully!");
    } catch (err) {
      showError(err.response?.data?.error || "Failed to register student");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <AdminMobileShell title="Register Student" subtitle="Add new student to department">
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
      backTo="/hod/dashboard"
    >
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
            <EnhancedInput
              type="text"
              placeholder="Enter student name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment ID</label>
            <EnhancedInput
              type="text"
              placeholder="Enter enrollment ID"
              name="enrollmentId"
              value={formData.enrollmentId}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <EnhancedInput
              type="email"
              placeholder="Enter email address"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <EnhancedInput
              type="tel"
              placeholder="Enter phone number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temporary Password</label>
            <EnhancedInput
              type="password"
              placeholder="Enter temporary password"
              name="tempPassword"
              value={formData.tempPassword}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              className="input-base"
              name="class"
              value={formData.class}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} {cls.year ? `- ${cls.year}` : ""}
                </option>
              ))}
            </select>
          </div>

          <EnhancedButton
            type="submit"
            disabled={loading}
            loading={loading}
            variant="primary"
            size="lg"
            className="w-full"
          >
            {loading ? "Registering..." : "Register Student"}
          </EnhancedButton>
        </form>
      </div>
    </AdminMobileShell>
  );
}
