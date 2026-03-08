import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import { isValidEmail, validatePassword } from "../../utils/validation";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function HODRegistration() {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    department: ""
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        console.log("Fetching available departments...");
        
        // Use admin API to get departments
        const response = await adminAPI.departments.list();
        console.log("Departments response:", response);
        
        // Filter departments that don't have HOD assigned
        const availableDepartments = response.data?.filter(dept => !dept.hod) || [];
        console.log("Available departments (no HOD):", availableDepartments);
        setDepartments(availableDepartments);
        
        if (availableDepartments.length === 0) {
          console.log("No departments available without HOD");
        }
        
      } catch (err) {
        console.error("Failed to fetch departments:", err);
        // Don't show error to user, just use empty list
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    // Validation
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }
    
    if (!formData.department) {
      setError("Please select a department");
      return;
    }

    try {
      setLoading(true);
      
      const hodData = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        name: formData.name.trim() || `HOD of ${departments.find(d => d._id === formData.department)?.name || 'Department'}`,
        phone: formData.phone.trim() || "",
        role: "hod",
        department: departments.find(d => d._id === formData.department)?.name || formData.department
      };

      console.log("Registering HOD with data:", hodData);
      
      // Create HOD user using students endpoint (creates user in MongoDB Atlas)
      const userData = {
        name: hodData.name,
        email: hodData.email,
        password: hodData.password,
        phone: hodData.phone,
        role: "hod",
        department: hodData.department
      };
      
      const userResponse = await adminAPI.students.create(userData);
      console.log("User created successfully in MongoDB Atlas:", userResponse);
      
      // Get the created user ID
      const createdUser = userResponse.data;
      
      // Update department with HOD info using the department ID
      const selectedDept = departments.find(d => d.name === hodData.department);
      if (selectedDept && createdUser._id) {
        const hodAssignmentData = {
          hodId: createdUser._id,
          hodName: createdUser.name,
          hodEmail: createdUser.email
        };
        
        await adminAPI.registerHodForDepartment(selectedDept._id, hodAssignmentData);
        console.log("Department updated with HOD info in MongoDB Atlas");
      }
      
      setSuccessMessage(`HOD registration successful! ${createdUser.name} (${createdUser.email}) is now the Head of ${hodData.department} department.`);
      showSuccess(`HOD registered for ${hodData.department} department!`);
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        department: ""
      });
      
      // Redirect to admin department page after 2 seconds
      setTimeout(() => {
        navigate("/admin/departments");
      }, 2000);
      
    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage = err.response?.data?.error || err.message || "Registration failed. Please try again.";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <AdminMobileShell
      title="HOD Registration"
      subtitle="Register as Head of Department"
      headerColor="bg-gradient-to-r from-green-600 to-teal-700"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm border border-green-200">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name (Optional)
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input-base"
              placeholder="Enter your full name (optional)"
              disabled={loading}
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
              onChange={handleInputChange}
              className="input-base"
              placeholder="Enter your email"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="input-base"
              placeholder="Enter your phone number (optional)"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Department *
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="input-base"
              disabled={loading}
              required
            >
              <option value="">Choose a department</option>
              {departments.map(dept => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {departments.length === 0 ? (
              <p className="text-xs text-red-500 mt-1">
                No departments available without HOD. Please contact admin to create departments first.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                {departments.length} department{departments.length !== 1 ? 's' : ''} available without HOD
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="input-base"
              placeholder="Create a password"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="input-base"
              placeholder="Confirm your password"
              disabled={loading}
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading || departments.length === 0}
              className="btn-primary flex-1"
            >
              {loading ? "Registering..." : "Register as HOD"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>

      {/* Information Card */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 mt-4">
        <div className="flex items-start">
          <div className="text-blue-600 mr-3 mt-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Department Head Registration</h4>
            <p className="text-sm text-blue-800">
              Register as Head of Department to get full access like college structure. After registration, you'll have complete control over your department including classes, students, elections, and notices.
            </p>
          </div>
        </div>
      </div>
    </AdminMobileShell>
  );
}
