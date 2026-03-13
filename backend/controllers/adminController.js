import mongoose from "mongoose";
import Department from "../models/Department.js";
import ClassModel from "../models/Class.js";
import Notice from "../models/Notice.js";
import Election from "../models/Election.js";
import Candidate from "../models/Candidate.js";
import User from "../models/User.js";

// Password validation function (same as frontend and authController)
function validatePassword(password) {
  if (!password || password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters" };
  }
  
  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one letter" };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number" };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one special character" };
  }
  
  return { isValid: true };
}

export async function registerAdmin(req, res) {
  try {
    const { name, email, password, phone, avatarUrl } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    // Only allow avatars2610@gmail.com to be admin
    const ADMIN_EMAIL = "avatars2610@gmail.com";
    if (normalizedEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Only the designated admin email can be registered as admin" });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      return res.status(409).json({ error: "Admin already exists. Only one admin is allowed." });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      phone: phone ? String(phone).trim() : undefined,
      avatarUrl: avatarUrl ? String(avatarUrl).trim() : undefined,
      role: "admin",
      is_admin: true,
    });
    return res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error("registerAdmin error:", err);
    return res.status(500).json({ error: "Server error creating admin" });
  }
}

export async function registerStudent(req, res) {
  try {
    const { name, enrollmentId, email, phone, tempPassword, department, class: classId } = req.body || {};
    console.log("registerStudent API - input:", { name, enrollmentId, email, department, class: classId, userRole: req.user?.role });
    
    if (!name || !email || !tempPassword) {
      return res.status(400).json({ error: "name, email and tempPassword are required" });
    }

    // Validate password using same validation as login
    const passwordValidation = validatePassword(tempPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // If a student with this email already exists, update their details instead of failing
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.role === "admin" || existing.is_admin === true) {
        return res.status(409).json({ error: "This email is already used by the admin account" });
      }
      // Optional: prevent enrollmentId collision with another user
      if (enrollmentId) {
        const enrollmentValue = String(enrollmentId).trim();
        const other = await User.findOne({ studentId: enrollmentValue, _id: { $ne: existing._id } });
        if (other) {
          return res.status(409).json({ error: "Enrollment ID already registered" });
        }
        existing.studentId = enrollmentValue;
      }
      existing.name = String(name).trim();
      existing.phone = phone ? String(phone).trim() : existing.phone;
      existing.department = department || existing.department;
      existing.class = classId || existing.class;
      if (tempPassword) {
        existing.password = tempPassword;
      }
      await existing.save();
      console.log("registerStudent API - updated existing student:", { _id: existing._id, class: existing.class, department: existing.department });
      const { password: _p, ...safeExisting } = existing.toObject();
      return res.status(200).json(safeExisting);
    }

    if (enrollmentId) {
      const existingId = await User.findOne({ studentId: String(enrollmentId).trim() });
      if (existingId) return res.status(409).json({ error: "Enrollment ID already registered" });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      studentId: enrollmentId ? String(enrollmentId).trim() : undefined,
      password: tempPassword,
      phone: phone ? String(phone).trim() : undefined,
      department: department || undefined,
      class: classId || undefined,
      role: "student",
      is_admin: false,
    });
    
    console.log("registerStudent API - created new student:", { _id: user._id, class: user.class, department: user.department });
    const { password: _, ...safe } = user.toObject();
    return res.status(201).json(safe);
  } catch (err) {
    console.error("registerStudent error:", err);
    if (err?.name === "ValidationError") {
      const messages = Object.values(err.errors || {}).map((e) => e.message);
      const msg = messages[0] || "Invalid data";
      return res.status(400).json({ error: msg });
    }
    if (err?.code === 11000) {
      const pattern = err.keyPattern || {};
      if (pattern.email) {
        return res.status(409).json({ error: "Email already registered" });
      }
      if (pattern.studentId) {
        return res.status(409).json({ error: "Enrollment ID already registered" });
      }
      return res.status(409).json({ error: "Duplicate field value already exists" });
    }
    return res.status(500).json({ error: "Server error creating student" });
  }
}

export async function listStudents(req, res) {
  try {
    const filter = { role: "student" };
    if (req.query.department) {
      filter.department = req.query.department;
    }
    if (req.query.class) {
      filter.class = req.query.class;
    }
    console.log("listStudents API - filter:", filter);
    console.log("listStudents API - user role:", req.user?.role);
    const items = await User.find(filter).select("-password").populate("department class");
    console.log("listStudents API - found students:", items.length);
    res.json(items);
  } catch (err) {
    console.error("listStudents error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    const { name, email, studentId, phone, department, class: classId } = req.body || {};

    // Find the student
    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.role !== "student") {
      return res.status(400).json({ error: "User is not a student" });
    }

    // Check for email uniqueness (if email is being changed)
    if (email && email !== student.email) {
      const normalizedNewEmail = String(email).trim().toLowerCase();
      const existingEmail = await User.findOne({ email: normalizedNewEmail, _id: { $ne: id } });
      if (existingEmail) {
        return res.status(409).json({ error: "Email already in use by another user" });
      }
      student.email = normalizedNewEmail;
    }

    // Check for studentId uniqueness (if studentId is being changed)
    if (studentId && studentId !== student.studentId) {
      const normalizedStudentId = String(studentId).trim();
      const existingStudentId = await User.findOne({ studentId: normalizedStudentId, _id: { $ne: id } });
      if (existingStudentId) {
        return res.status(409).json({ error: "Student ID already in use by another student" });
      }
      student.studentId = normalizedStudentId;
    }

    // Update other fields
    if (name !== undefined) student.name = String(name).trim();
    if (phone !== undefined) student.phone = phone ? String(phone).trim() : "";
    if (department !== undefined) student.department = department || undefined;
    if (classId !== undefined) student.class = classId || undefined;

    await student.save();

    const { password: _p, ...safeStudent } = student.toObject();
    const populatedStudent = await User.findById(id).select("-password").populate("department class");

    res.json(populatedStudent);
  } catch (err) {
    console.error("updateStudent error:", err);
    if (err?.name === "ValidationError") {
      const messages = Object.values(err.errors || {}).map((e) => e.message);
      const msg = messages[0] || "Invalid data";
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: "Server error updating student" });
  }
}

export async function listDepartments(req, res) {
  try {
    const items = await Department.find().populate('hod', 'name email');
    res.json(items);
  } catch (err) {
    console.error("listDepartments error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createDepartment(req, res) {
  try {
    const { name, hod, hodEmail, hodPassword, hodPhone } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Department name is required" });
    
    let hodId = null;
    let createdHod = null;
    
    // Option 1: Create new HOD with email/password (takes priority)
    if (hodEmail && hodPassword) {
      // Validate password
      const passwordValidation = validatePassword(hodPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ error: `HOD password: ${passwordValidation.error}` });
      }
      
      // Check if HOD with this email already exists
      const existingHod = await User.findOne({ email: hodEmail.toLowerCase().trim() });
      if (existingHod) {
        return res.status(400).json({ error: "HOD with this email already exists" });
      }
      
      // Create new HOD user
      createdHod = new User({
        name: hod || `HOD of ${name}`,
        email: hodEmail.toLowerCase().trim(),
        password: hodPassword,
        phone: hodPhone || '',
        role: 'hod'
      });
      
      await createdHod.save();
      hodId = createdHod._id;
    }
    // Option 2: Use existing HOD by ID (only if not creating new HOD)
    else if (hod) {
      if (!mongoose.Types.ObjectId.isValid(hod)) {
        return res.status(400).json({ error: "Invalid HOD ID format" });
      }
      // Verify HOD exists and has hod role
      const hodUser = await User.findById(hod);
      if (!hodUser || hodUser.role !== 'hod') {
        return res.status(400).json({ error: "Invalid HOD user" });
      }
      hodId = hod;
    }
    
    // Create department
    const department = await Department.create({ 
      name: String(name).trim(), 
      hod: hodId 
    });
    
    // If we created a new HOD, update their department fields
    if (createdHod) {
      createdHod.department = department._id;        // Where HOD was registered
      createdHod.assignedDepartment = department._id; // Where HOD is assigned
      await createdHod.save();
    }
    
    // Populate and return response
    const populatedDepartment = await Department.findById(department._id)
      .populate('hod', 'name email');
    
    res.status(201).json({
      department: populatedDepartment,
      hod: createdHod ? {
        id: createdHod._id,
        name: createdHod.name,
        email: createdHod.email,
        role: createdHod.role
      } : null
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Department already exists" });
    console.error("createDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getDepartment(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const d = await Department.findById(req.params.id);
    if (!d) return res.status(404).json({ error: "Department not found" });
    res.json(d);
  } catch (err) {
    console.error("getDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listClasses(req, res) {
  try {
    const filter = req.query.department ? { department: req.query.department } : {};
    const items = await ClassModel.find(filter)
      .populate("department")
      .populate("classTeacher", "name email");
    res.json(items);
  } catch (err) {
    console.error("listClasses error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listAvailableClasses(req, res) {
  try {
    const filter = req.query.department ? { department: req.query.department } : {};
    // Only return classes that don't have a classTeacher assigned
    const items = await ClassModel.find({ ...filter, classTeacher: { $exists: false } })
      .populate("department");
    res.json(items);
  } catch (err) {
    console.error("listAvailableClasses error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createClass(req, res) {
  try {
    const { name, department, year, teacher, teacherEmail, teacherPassword, teacherPhone } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Class name is required" });
    if (!department) return res.status(400).json({ error: "Department is required" });
    
    // Validate department ObjectId
    if (!mongoose.Types.ObjectId.isValid(department)) {
      return res.status(400).json({ error: "Invalid department ID format" });
    }
    
    // Verify department exists
    const departmentObj = await Department.findById(department);
    if (!departmentObj) {
      return res.status(404).json({ error: "Department not found" });
    }
    
    let teacherId = null;
    let createdTeacher = null;
    
    // Option 1: Create new teacher with email/password (takes priority)
    if (teacherEmail && teacherPassword) {
      // Validate password
      const passwordValidation = validatePassword(teacherPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ error: `Teacher password: ${passwordValidation.error}` });
      }
      
      // Check if teacher with this email already exists
      const existingTeacher = await User.findOne({ email: teacherEmail.toLowerCase().trim() });
      if (existingTeacher) {
        return res.status(400).json({ error: "Teacher with this email already exists" });
      }
      
      // Create new teacher user
      createdTeacher = new User({
        name: teacher || `Teacher of ${name}`,
        email: teacherEmail.toLowerCase().trim(),
        password: teacherPassword,
        phone: teacherPhone || '',
        role: 'teacher',
        assignedDepartment: department
      });
      
      await createdTeacher.save();
      teacherId = createdTeacher._id;
    }
    // Option 2: Use existing teacher by ID (only if not creating new teacher)
    else if (teacher) {
      if (!mongoose.Types.ObjectId.isValid(teacher)) {
        return res.status(400).json({ error: "Invalid teacher ID format" });
      }
      // Verify teacher exists and has teacher role
      const teacherUser = await User.findById(teacher);
      if (!teacherUser || teacherUser.role !== 'teacher') {
        return res.status(400).json({ error: "Invalid teacher user" });
      }
      teacherId = teacher;
    }
    
    // Create class
    const classObj = await ClassModel.create({
      name: String(name).trim(),
      department: department,
      year: year ? String(year).trim() : undefined,
      classTeacher: teacherId
    });
    
    // If we created a new teacher, update their assignedClass
    if (createdTeacher) {
      createdTeacher.assignedClass = classObj._id;
      await createdTeacher.save();
    }
    
    // Populate and return response
    const populatedClass = await ClassModel.findById(classObj._id)
      .populate('department', 'name')
      .populate('classTeacher', 'name email');
    
    res.status(201).json({
      class: populatedClass,
      teacher: createdTeacher ? {
        id: createdTeacher._id,
        name: createdTeacher.name,
        email: createdTeacher.email,
        role: createdTeacher.role
      } : null
    });
  } catch (err) {
    console.error("createClass error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getClass(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const c = await ClassModel.findById(req.params.id).populate("department");
    if (!c) return res.status(404).json({ error: "Class not found" });
    const studentCount = await User.countDocuments({ class: c._id });
    res.json({ ...c.toObject(), studentCount });
  } catch (err) {
    console.error("getClass error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listNotices(req, res) {
  try {
    const filter = {};
    
    // For HOD routes, show both global notices and their department notices
    if (req.user.role === 'hod') {
      const departmentId = req.user.department || req.user.assignedDepartment;
      console.log("HOD Notices API - Filtering for department:", departmentId);
      
      filter.$or = [
        // Global notices that HODs can see
        { audience: "all" },
        { audience: "student" },
        { audience: "students" },
        { audience: "admins" },
        // Department-specific notices for their department
        { 
          audience: "department_students",
          targetDepartment: departmentId
        }
      ];
      console.log("HOD notice filter:", filter);
    }
    // For Teacher routes, show global notices and their class notices
    else if (req.user.role === 'teacher') {
      const classId = req.user.assignedClass;
      console.log("Teacher Notices API - Filtering for class:", classId);
      
      filter.$or = [
        // Global notices that Teachers can see
        { audience: "all" },
        { audience: "student" },
        { audience: "students" },
        { audience: "admins" },
        // Class-specific notices for their class
        { 
          audience: "class_students",
          targetClass: classId
        }
      ];
      console.log("Teacher notice filter:", filter);
    }
    // For admin routes, exclude department-specific notices (only show global notices)
    else if (req.user.role === 'admin') {
      filter.$or = [
        { audience: "all" },
        { audience: "student" },
        { audience: "students" },
        { audience: "admins" }
      ];
      // Exclude department_students and class_students audience from admin view
      filter.audience = { $nin: ["department_students", "class_students"] };
      console.log("Admin view - excluding department and class-specific notices");
    }
    
    // If department query parameter is provided (for admin filtering), also apply it
    if (req.query.department && req.user.role === 'admin') {
      filter.department = req.query.department;
      console.log("Filtering notices by department:", req.query.department);
    }
    
    const items = await Notice.find(filter).sort({ createdAt: -1 });
    console.log(`Found ${items.length} notices with filter:`, filter);
    res.json(items);
  } catch (err) {
    console.error("listNotices error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listNoticesForStudent(req, res) {
  try {
    const student = req.user;
    console.log("Fetching notices for student:", student.email, "department:", student.department, "class:", student.class);
    
    const filter = {
      $or: [
        // Global notices for all students
        { audience: "all" },
        { audience: "student" },
        { audience: "students" },
        // Department-specific notices for this student's department
        { 
          audience: "department_students",
          targetDepartment: student.department
        },
        // Class-specific notices for this student's class
        { 
          audience: "class_students",
          targetClass: student.class
        }
      ]
    };
    
    // Exclude notices from other departments and classes (unless they are global)
    const items = await Notice.find(filter).sort({ createdAt: -1 });
    console.log(`Found ${items.length} notices for student ${student.email} in department ${student.department}, class ${student.class}`);
    
    res.json(items);
  } catch (err) {
    console.error("listNoticesForStudent error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createNotice(req, res) {
  try {
    const { title, body, audience, attachment } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Notice title is required" });
    
    // For HOD routes, set audience to department_students and assign targetDepartment
    let noticeData = {
      title: String(title).trim(),
      body: body ? String(body).trim() : "",
      audience: "all", // Default for admin
      attachment: attachment || undefined,
    };
    
    // Add department if user is HOD and has department access
    if (req.user.role === 'hod' && (req.user.department || req.user.assignedDepartment)) {
      const departmentId = req.user.department || req.user.assignedDepartment;
      noticeData = {
        title: String(title).trim(),
        body: body ? String(body).trim() : "",
        audience: "department_students", // HOD notices are only for department students
        attachment: attachment || undefined,
        department: departmentId,
        targetDepartment: departmentId, // Explicitly set target department
        createdBy: req.user._id,
      };
      console.log("Creating HOD notice for department:", departmentId);
    }
    // Add class if user is Teacher and has class access
    else if (req.user.role === 'teacher' && req.user.assignedClass) {
      const classId = req.user.assignedClass;
      noticeData = {
        title: String(title).trim(),
        body: body ? String(body).trim() : "",
        audience: "class_students", // Teacher notices are only for class students
        attachment: attachment || undefined,
        class: classId,
        targetClass: classId, // Explicitly set target class
        createdBy: req.user._id,
      };
      console.log("Creating Teacher notice for class:", classId);
    }
    
    const n = await Notice.create(noticeData);
    console.log("Notice created:", n);
    res.status(201).json(n);
  } catch (err) {
    console.error("createNotice error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listElections(req, res) {
  try {
    const filter = {};
    
    // For HOD routes, show global and department-level elections
    if (req.user.role === 'hod') {
      const departmentId = req.user.department || req.user.assignedDepartment;
      console.log("HOD Elections API - Filtering for department:", departmentId);
      
      filter.$or = [
        // Global elections
        { level: "global" },
        // Department-level elections for their department
        { 
          level: "department",
          department: departmentId
        }
      ];
      console.log("HOD election filter:", filter);
    }
    // For Teacher routes, show global and class-level elections
    else if (req.user.role === 'teacher') {
      const classId = req.user.assignedClass;
      console.log("Teacher Elections API - Filtering for class:", classId);
      
      filter.$or = [
        // Global elections
        { level: "global" },
        // Class-level elections for their class
        { 
          level: "class",
          class: classId
        }
      ];
      console.log("Teacher election filter:", filter);
    }
    // For admin routes, show all elections
    else if (req.user.role === 'admin') {
      // No filtering for admin - show all
      console.log("Admin view - showing all elections");
    }
    
    // Additional query parameter filtering for admin
    if (req.query.department && req.user.role === 'admin') {
      filter.department = req.query.department;
    }
    if (req.query.class && req.user.role === 'admin') {
      filter.class = req.query.class;
    }
    
    const elections = await Election.find(filter)
      .sort({ createdAt: -1 })
      .populate("department class");

    const items = await Promise.all(
      elections.map(async (e) => ({
        ...e.toObject(),
        candidateCount: await Candidate.countDocuments({ election: e._id }),
      }))
    );

    res.json(items);
  } catch (err) {
    console.error("listElections error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createElection(req, res) {
  try {
    const { title, description, startDate, endDate, level, department, class: classId } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Election title is required" });

    let normalizedLevel = level;
    let deptRef;
    let classRef;

    // Set level and validate based on user role
    if (req.user.role === 'teacher') {
      // Teachers can only create class-level elections for their assigned class
      normalizedLevel = "class";
      classRef = req.user.assignedClass;
      console.log("Teacher creating class-level election for class:", classRef);
    } else if (req.user.role === 'hod') {
      // HODs can create department-level elections for their department
      if (level === "department" || !level) {
        normalizedLevel = "department";
        deptRef = req.user.department || req.user.assignedDepartment;
        console.log("HOD creating department-level election for department:", deptRef);
      } else if (level === "global") {
        normalizedLevel = "global";
        console.log("HOD creating global election");
      } else {
        return res.status(403).json({ error: "HODs can only create department-level or global elections" });
      }
    } else if (req.user.role === 'admin') {
      // Admins can create any level
      normalizedLevel = ["global", "department", "class"].includes(level) ? level : "global";
      
      if (normalizedLevel === "department") {
        if (!department || !mongoose.Types.ObjectId.isValid(department)) {
          return res.status(400).json({ error: "Valid department is required for department-level elections" });
        }
        deptRef = department;
      }

      if (normalizedLevel === "class") {
        if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
          return res.status(400).json({ error: "Valid class is required for class-level elections" });
        }
        classRef = classId;
      }
    }

    const e = await Election.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      level: normalizedLevel,
      department: deptRef,
      class: classRef,
    });
    res.status(201).json(e);
  } catch (err) {
    console.error("createElection error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function addCandidate(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid election ID" });

    const election = await Election.findById(id);
    if (!election) return res.status(404).json({ error: "Election not found" });

    // Access control for teachers
    if (req.user.role === 'teacher') {
      // Teachers can only add candidates to their class's elections
      if (election.level === "class" && election.class.toString() !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: "Access denied. You can only add candidates to your class's elections." });
      }
      // Teachers cannot add candidates to department or global elections
      if (election.level !== "class") {
        return res.status(403).json({ error: "Teachers can only add candidates to class-level elections." });
      }
    }

    const { userId, studentId, position } = req.body || {};
    if (!userId && !studentId) {
      return res.status(400).json({ error: "userId or studentId is required to register candidate" });
    }

    let studentUser = null;
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid userId" });
      studentUser = await User.findById(userId);
    } else {
      studentUser = await User.findOne({ studentId: String(studentId).trim() });
    }

    if (!studentUser) return res.status(404).json({ error: "Student not found" });
    if (studentUser.role !== "student") return res.status(400).json({ error: "Only student users can be candidates" });

    // Eligibility check based on election level
    if (election.level === "department") {
      if (!studentUser.department || studentUser.department.toString() !== String(election.department)) {
        return res.status(400).json({ error: "Student is not in the required department for this election" });
      }
    }
    if (election.level === "class") {
      if (!studentUser.class || studentUser.class.toString() !== String(election.class)) {
        return res.status(400).json({ error: "Student is not in the required class for this election" });
      }
    }

    const candidate = await Candidate.create({
      election: id,
      student: studentUser._id,
      name: studentUser.name,
      position: position ? String(position).trim() : "",
    });
    res.status(201).json(candidate);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "This student is already registered as a candidate for this election" });
    }
    console.error("addCandidate error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function electionResults(req, res) {
  try {
    const { electionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(electionId)) return res.status(400).json({ error: "Invalid election ID" });

    const election = await Election.findById(electionId).populate("department class");
    if (!election) return res.status(404).json({ error: "Election not found" });

    // Access control based on user role
    if (req.user.role === 'teacher') {
      // Teachers can only view results for their class's elections or global elections
      if (election.level === "class" && election.class._id.toString() !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: "Access denied. You can only view results for your class's elections." });
      }
    } else if (req.user.role === 'hod') {
      // HODs can only view results for their department's elections or global elections
      if (election.level === "department" && election.department._id.toString() !== (req.user.department || req.user.assignedDepartment).toString()) {
        return res.status(403).json({ error: "Access denied. You can only view results for your department's elections." });
      }
    }

    const candidates = await Candidate.find({ election: electionId })
      .sort({ votes: -1 })
      .populate("student", "name email studentId department class");

    let winner = null;
    let isDraw = false;
    let tiedCandidates = [];

    if (candidates.length > 0) {
      const topVotes = candidates[0].votes;
      
      // Check if there's a tie for first place
      const topCandidates = candidates.filter(candidate => candidate.votes === topVotes);
      
      if (topCandidates.length > 1 && topVotes > 0) {
        // It's a draw
        isDraw = true;
        tiedCandidates = topCandidates;
        winner = null;
      } else if (topVotes > 0) {
        // Clear winner
        winner = candidates[0];
        isDraw = false;
      }
    }

    res.json({ 
      election, 
      candidates, 
      winner, 
      isDraw, 
      tiedCandidates,
      message: isDraw ? "Election resulted in a draw - no winner declared" : winner ? "Winner declared" : "No votes cast"
    });
  } catch (err) {
    console.error("electionResults error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getDashboardStats(req, res) {
  try {
    console.log("Getting dashboard stats...");
    const now = new Date();
    const [deptCount, studentCount, allElections] = await Promise.all([
      Department.countDocuments(),
      User.countDocuments({ role: "student" }),
      Election.find(),
    ]);
    const activeElections = allElections.filter(
      (e) =>
        (!e.startDate || new Date(e.startDate) <= now) &&
        (!e.endDate || new Date(e.endDate) >= now)
    ).length;
    
    console.log("Stats calculated:", { deptCount, studentCount, activeElections });
    res.json({ deptCount, studentCount, activeElections });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function deleteDepartment(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid department ID" });
    }

    console.log("Deleting department:", id);

    // Check if department exists
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Find all classes in this department
    const classesInDepartment = await ClassModel.find({ department: id });
    console.log(`Found ${classesInDepartment.length} classes in department`);

    // Delete all students in these classes
    const classIds = classesInDepartment.map(c => c._id);
    const deletedStudents = await User.deleteMany({ 
      role: "student",
      class: { $in: classIds }
    });
    console.log(`Deleted ${deletedStudents.deletedCount} students in department classes`);

    // Remove students from any candidates
    await Candidate.deleteMany({ student: { $in: classIds } });

    // Delete all classes in this department
    const deletedClasses = await ClassModel.deleteMany({ department: id });
    console.log(`Deleted ${deletedClasses.deletedCount} classes in department`);

    // Update any remaining students to remove department reference
    await User.updateMany(
      { department: id },
      { $unset: { department: 1 } }
    );
    console.log("Updated remaining students to remove department reference");

    // Update HOD to remove department reference
    await User.updateMany(
      { $or: [{ department: id }, { assignedDepartment: id }] },
      { $unset: { department: 1, assignedDepartment: 1 } }
    );
    console.log("Updated HODs to remove department reference");

    // Delete the department
    await Department.findByIdAndDelete(id);
    console.log("Department deleted successfully:", id);

    res.json({ 
      message: "Department deleted successfully",
      deletedClasses: deletedClasses.deletedCount,
      deletedStudents: deletedStudents.deletedCount
    });
  } catch (err) {
    console.error("deleteDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function deleteClass(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid class ID" });
    }

    console.log("Deleting class:", id);

    // Check if class exists
    const classItem = await ClassModel.findById(id);
    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Delete all students in this class (complete deletion from database)
    const deletedStudents = await User.deleteMany({ 
      role: "student",
      class: id 
    });
    console.log(`Deleted ${deletedStudents.deletedCount} students in class`);

    // Remove these students from any candidates
    await Candidate.deleteMany({ student: { $in: deletedStudents.deletedCount > 0 ? id : [] } });

    // Update teachers to remove class reference
    await User.updateMany(
      { assignedClass: id },
      { $unset: { assignedClass: 1 } }
    );
    console.log("Updated teachers to remove class reference");

    // Delete the class
    await ClassModel.findByIdAndDelete(id);
    console.log("Class deleted successfully:", id);

    res.json({ 
      message: "Class deleted successfully",
      deletedStudents: deletedStudents.deletedCount
    });
  } catch (err) {
    console.error("deleteClass error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function deleteStudent(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    console.log("Deleting student:", id);

    // Check if student exists and is actually a student
    const student = await User.findOne({ _id: id, role: "student" });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Remove student from any candidates
    await Candidate.deleteMany({ student: id });
    console.log("Removed student from candidates");

    // Delete the student
    await User.findByIdAndDelete(id);
    console.log("Student deleted successfully:", id);

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("deleteStudent error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
