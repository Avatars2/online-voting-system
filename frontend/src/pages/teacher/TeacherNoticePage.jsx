import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function TeacherNoticePage() {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showCreateNotice, setShowCreateNotice] = useState(false);

  // Form data for creating notice
  const [noticeFormData, setNoticeFormData] = useState({
    title: "",
    message: "",
    type: "general"
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await authAPI.verifyToken();
        setUser(userResponse.data);

        if (userResponse.data.assignedClass) {
          const [classResponse, noticesResponse] = await Promise.all([
            adminAPI.getClass(userResponse.data.assignedClass),
            adminAPI.notices.list()
          ]);
          setClassData(classResponse.data);
          
          // Filter notices for this teacher's class
          const classNotices = (noticesResponse.data || []).filter(
            notice => notice.class === classResponse.data._id
          );
          setNotices(classNotices);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load data");
      }
    };

    fetchData();
  }, []);

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!noticeFormData.title.trim()) {
      setError("Notice title is required");
      return;
    }
    if (!noticeFormData.message.trim()) {
      setError("Notice message is required");
      return;
    }

    try {
      setLoading(true);
      
      const noticeData = {
        title: noticeFormData.title.trim(),
        message: noticeFormData.message.trim(),
        type: noticeFormData.type,
        class: classData._id,
        department: classData.department._id,
        createdBy: user._id
      };

      await adminAPI.notices.create(noticeData);

      setSuccessMessage("Notice created successfully!");
      showSuccess("Notice created successfully!");
      setNoticeFormData({
        title: "",
        message: "",
        type: "general"
      });
      setShowCreateNotice(false);
      
      // Refresh notices list
      const noticesResponse = await adminAPI.notices.list();
      const classNotices = (noticesResponse.data || []).filter(
        notice => notice.class === classData._id
      );
      setNotices(classNotices);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create notice");
      showError(err.response?.data?.error || "Failed to create notice");
    } finally {
      setLoading(false);
    }
  };

  if (!classData) {
    return (
      <AdminMobileShell title="Class Notices" subtitle="Manage Notices">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell title="Class Notices" subtitle={`${classData.name} Notices`}>
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

      {/* Class Info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Class Information</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Class:</span>
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
        </div>
      </div>

      {/* Create Notice Button */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <button
          onClick={() => setShowCreateNotice(true)}
          className="btn-primary w-full"
        >
          Create New Notice
        </button>
      </div>

      {/* Notices List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-gray-900">Class Notices</div>
          <div className="text-xs font-semibold text-gray-500">{notices.length} TOTAL</div>
        </div>
        <div className="space-y-2">
          {notices.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center text-gray-600">
              No notices created yet
            </div>
          ) : (
            notices.map((notice) => (
              <div key={notice._id} className="p-4 border rounded-xl bg-white">
                <div className="font-semibold text-gray-900">{notice.title}</div>
                <div className="text-sm text-gray-600 mt-1">{notice.message}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Created: {new Date(notice.createdAt).toLocaleDateString()}
                </div>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                    notice.type === 'urgent' ? 'bg-red-100 text-red-700' :
                    notice.type === 'important' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {notice.type}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Notice Modal */}
      {showCreateNotice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 w-full max-w-md">
            <div className="font-bold text-gray-900 mb-3">Create Notice</div>
            <form onSubmit={handleCreateNotice} className="space-y-3">
              <input
                type="text"
                placeholder="Notice Title"
                value={noticeFormData.title}
                onChange={(e) => setNoticeFormData({...noticeFormData, title: e.target.value})}
                className="input-base"
                required
              />
              <textarea
                placeholder="Notice Message"
                value={noticeFormData.message}
                onChange={(e) => setNoticeFormData({...noticeFormData, message: e.target.value})}
                className="input-base"
                rows={4}
                required
              />
              <select
                value={noticeFormData.type}
                onChange={(e) => setNoticeFormData({...noticeFormData, type: e.target.value})}
                className="input-base"
              >
                <option value="general">General</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
              
              <div className="flex space-x-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Creating..." : "Create Notice"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateNotice(false)}
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
