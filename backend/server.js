
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Security middleware
import { securityHeaders, authLimiter, generalLimiter, uploadLimiter, teacherLimiter, xssProtection, sanitizeInput, securityLogger } from "./middleware/security.js";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import studentRoutes from "./routes/student.js";
import noticeRoutes from "./routes/notice.js";
import hodRoutes from "./routes/hod.js";
import teacherRoutes from "./routes/teacher.js";

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept PDF files only
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

dotenv.config();

 (async () => {
  const app = express();
  
  // Security middleware
  app.use(securityHeaders);
  app.use(securityLogger);
  app.use(xssProtection);
  app.use(sanitizeInput);
  
  // Rate limiting
  app.use(generalLimiter);
  
  // Configure CORS
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  }));
  
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  const PORT = process.env.PORT || 5001;

  await connectDB();

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Apply auth rate limiting to authentication routes
  app.use("/api/auth", authLimiter);
  
  // Apply teacher-specific rate limiting to teacher routes
  app.use("/api/teacher", teacherLimiter);
  
  // Apply upload rate limiting to upload routes
  app.use("/api/notices/upload", uploadLimiter);

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/student", studentRoutes);
  app.use("/api/notices", noticeRoutes);
  app.use("/api/hod", hodRoutes);
  app.use("/api/teacher", teacherRoutes);

  // File upload route for notices
  app.post("/api/notices/upload", upload.single('pdf'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ 
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`
    });
  });

  app.get("/", (req, res) => res.send({ ok: true, message: "OVS backend running" }));

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})()
