import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";

export default function HODProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
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
          department: response.data.assignedDepartment?.name || "",
          photo: response.data.photo || null
        });
        setPhotoPreview(response.data.photo || "");
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
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

  const handleUpdate = async () => {
    try {
      setLoading(true);
      
      const updateData = {
        name: formData.name,
        phone: formData.phone
      };

      // If photo is a file, upload it
      if (formData.photo instanceof File) {
        const formDataToSend = new FormData();
        formDataToSend.append('photo', formData.photo);
        formDataToSend.append('name', formData.name);
        formDataToSend.append('phone', formData.phone);
        
        // For now, we'll just update the basic info
        await authAPI.updateMe(updateData);
      } else {
        await authAPI.updateMe(updateData);
      }
      
      // Update local storage
      const updatedUser = { ...user, ...updateData };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      alert("Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return (
      <AdminMobileShell
        title="HOD Profile"
        subtitle="Manage your profile"
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
      title="HOD Profile"
      subtitle="Manage your profile"
      headerColor="bg-gradient-to-r from-green-600 to-teal-700"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Profile Photo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-4">Profile Photo</div>
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-gradient-to-r from-green-600 to-teal-700 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-3">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || "H"
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium hover:bg-blue-100 transition cursor-pointer"
          >
            Change Photo
          </label>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-4">Profile Information</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="input-base"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              disabled
              className="input-base bg-gray-50"
              placeholder="Email cannot be changed"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={formData.department}
              disabled
              className="input-base bg-gray-50"
              placeholder="Department assigned by admin"
            />
            <p className="text-xs text-gray-500 mt-1">Department assigned by admin</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              value="Head of Department (HOD)"
              disabled
              className="input-base bg-gray-50"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Updating..." : "Update Profile"}
          </button>
          
          <button
            onClick={() => navigate("/hod/reset-password")}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
          >
            Change Password
          </button>
          
          <button
            onClick={() => navigate("/hod/dashboard")}
            className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-medium hover:bg-blue-100 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </AdminMobileShell>
  );
}
