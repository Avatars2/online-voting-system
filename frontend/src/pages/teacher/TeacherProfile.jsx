import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function TeacherProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    class: "",
    department: "",
    photo: null
  });
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authAPI.verifyToken();
        setUser(response.data);
        setFormData({
          name: response.data.name || "",
          email: response.data.email || "",
          phone: response.data.phone || "",
          class: "",
          department: "",
          photo: response.data.photo || null
        });
        setPhotoPreview(response.data.photo || "");

        // Get class information
        if (response.data.assignedClass) {
          const classResponse = await adminAPI.getClass(response.data.assignedClass);
          setClassData(classResponse.data);
          setFormData(prev => ({
            ...prev,
            class: classResponse.data.name,
            department: classResponse.data.department?.name || ""
          }));
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load profile");
      }
    };

    fetchProfile();
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Photo size should be less than 5MB");
        return;
      }
      setFormData({...formData, photo: file});
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setLoading(true);
      
      const updateData = new FormData();
      updateData.append('name', formData.name.trim());
      updateData.append('phone', formData.phone.trim());
      
      if (formData.photo instanceof File) {
        updateData.append('photo', formData.photo);
      }

      await authAPI.updateMe(updateData);
      
      setSuccess("Profile updated successfully!");
      
      // Refresh user data
      const response = await authAPI.verifyToken();
      setUser(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminMobileShell title="Teacher Profile" subtitle="Manage Your Information">
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

      {/* Profile Photo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-4">Profile Photo</div>
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-pink-700 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-3">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || "T"
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            id="teacher-photo-upload"
          />
          <label
            htmlFor="teacher-photo-upload"
            className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium hover:bg-blue-100 transition cursor-pointer"
          >
            Change Photo
          </label>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-4">Personal Information</div>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="input-base"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              className="input-base bg-gray-50"
              disabled
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="input-base"
              placeholder="Enter your phone number"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </div>

      {/* Professional Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-4">Professional Information</div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              value="Teacher"
              className="input-base bg-gray-50"
              disabled
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Class</label>
            <input
              type="text"
              value={formData.class || "Not assigned"}
              className="input-base bg-gray-50"
              disabled
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={formData.department || "Not assigned"}
              className="input-base bg-gray-50"
              disabled
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-4">Account Actions</div>
        <div className="space-y-2">
          <button
            onClick={() => navigate("/teacher/reset-password")}
            className="w-full p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 font-medium hover:bg-orange-100 transition"
          >
            Change Password
          </button>
          <button
            onClick={() => navigate("/teacher/dashboard")}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </AdminMobileShell>
  );
}
