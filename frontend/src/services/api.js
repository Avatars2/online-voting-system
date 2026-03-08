import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Public API instance without authentication for registration
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Public registration API without token requirement
export const publicAPI = {
  registerHOD: (hodData) => publicApi.post("/auth/register/hod", hodData),
  getDepartments: () => publicApi.get("/admin/departments"),
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== "/") {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  verifyToken: () => api.get("/auth/verify"),
  changePassword: (oldPassword, newPassword) =>
    api.post("/auth/change-password", { oldPassword, newPassword }),
  updateMe: (payload) => api.put("/auth/me", payload),
};

export const adminAPI = {
  stats: () => api.get("/admin/stats"),
  departments: { list: () => api.get("/admin/departments"), create: (d) => api.post("/admin/departments", d) },
  classes: { list: (deptId) => api.get("/admin/classes", { params: deptId ? { department: deptId } : {} }), create: (d) => api.post("/admin/classes", d) },
  notices: { list: () => api.get("/admin/notices"), create: (d) => api.post("/admin/notices", d) },
  elections: { list: () => api.get("/admin/elections"), create: (d) => api.post("/admin/elections", d) },
  addCandidate: (electionId, d) => api.post(`/admin/elections/${electionId}/candidates`, d),
  results: (electionId) => api.get(`/admin/results/${electionId}`),
  students: {
    list: () => api.get("/admin/students"),
    create: (d) => api.post("/admin/students", d),
    update: (id, d) => api.put(`/admin/students/${id}`, d),
    delete: (id) => api.delete(`/admin/students/${id}`)
  },
  getDepartment: (id) => api.get(`/admin/departments/${id}`),
  getClass: (id) => api.get(`/admin/classes/${id}`),

  // HOD API endpoints
  hod: {
    dashboard: () => api.get("/hod/dashboard"),
    profile: () => api.get("/hod/profile"),
    updateProfile: (d) => api.put("/hod/profile", d),
    changePassword: (d) => api.put("/hod/change-password", d),
    registerStudent: (d) => api.post("/hod/register-student", d),
    createClass: (d) => api.post("/hod/classes", d),
    listClasses: () => api.get("/hod/classes"),
    registerTeacher: (d) => api.post("/hod/register-teacher", d),
    listTeachers: () => api.get("/hod/teachers"),
    createNotice: (d) => api.post("/hod/notices", d),
    listNotices: () => api.get("/hod/notices"),
    createElection: (d) => api.post("/hod/elections", d),
    listElections: () => api.get("/hod/elections"),
    addCandidate: (electionId, d) => api.post(`/hod/elections/${electionId}/candidates`, d),
    getResults: (electionId) => api.get(`/hod/results/${electionId}`)
  },

  // Department HOD assignment
  assignHodToDepartment: (deptId, hodData) => api.put(`/admin/departments/${deptId}/assign-hod`, hodData),
  registerHodForDepartment: (deptId, hodData) => api.post(`/admin/departments/${deptId}/register-hod`, hodData),
};

export const studentAPI = {
  me: () => api.get("/student/me"),
  elections: () => api.get("/student/elections"),
  getElectionCandidates: (electionId) => api.get(`/student/elections/${electionId}/candidates`),
  vote: (electionId, candidateId) => api.post(`/student/vote/${electionId}/${candidateId}`),
};

export const noticesAPI = { list: () => api.get("/notices") };

export default api;
