import User from '../models/User.js';
import Department from '../models/Department.js';
import Class from '../models/Class.js';
import bcrypt from 'bcryptjs';

// Register HOD (by admin only)
export const registerHOD = async (req, res) => {
  try {
    const { name, email, password, phone, departmentId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Verify department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Create HOD
    const hod = new User({
      name,
      email,
      password,
      phone,
      role: 'hod',
      department: departmentId,        // Where HOD was registered
      assignedDepartment: departmentId // Where HOD is assigned (same for now)
    });

    await hod.save();

    // Update department with HOD
    department.hod = hod._id;
    await department.save();

    res.status(201).json({
      message: 'HOD registered successfully',
      hod: {
        id: hod._id,
        name: hod.name,
        email: hod.email,
        role: hod.role,
        department: departmentId,        // Where HOD was registered
        assignedDepartment: departmentId, // Where HOD is assigned
        departmentName: department.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register Teacher (by HOD or admin)
export const registerTeacher = async (req, res) => {
  try {
    const { name, email, password, phone, classId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Verify class exists
    const classObj = await Class.findById(classId).populate('department');
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Create Teacher
    const teacher = new User({
      name,
      email,
      password,
      phone,
      role: 'teacher',
      assignedClass: classId,
      assignedDepartment: classObj.department._id
    });

    await teacher.save();

    // Update class with class teacher
    classObj.classTeacher = teacher._id;
    await classObj.save();

    res.status(201).json({
      message: 'Teacher registered successfully',
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        class: classObj.name,
        department: classObj.department.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get HOD dashboard data
export const getHODDashboard = async (req, res) => {
  try {
    const hod = req.user;
    
    // Get department details
    const department = await Department.findById(hod.assignedDepartment)
      .populate('hod', 'name email');

    // Get all classes in this department
    const classes = await Class.find({ department: hod.assignedDepartment })
      .populate('classTeacher', 'name email');

    // Get all students in department
    const students = await User.find({ 
      role: 'student',
      department: hod.assignedDepartment 
    }).populate('class', 'name year');

    // Get teachers in department
    const teachers = await User.find({ 
      role: 'teacher',
      assignedDepartment: hod.assignedDepartment 
    }).populate('assignedClass', 'name year');

    res.json({
      department,
      classes,
      students,
      teachers,
      stats: {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: classes.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Teacher dashboard data
export const getTeacherDashboard = async (req, res) => {
  try {
    const teacher = req.user;
    
    // Get class details
    const classObj = await Class.findById(teacher.assignedClass)
      .populate('department', 'name')
      .populate('classTeacher', 'name email');

    // Get students in teacher's class
    const students = await User.find({ 
      role: 'student',
      class: teacher.assignedClass 
    });

    res.json({
      class: classObj,
      students,
      stats: {
        totalStudents: students.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all HODs (admin only)
export const getAllHODs = async (req, res) => {
  try {
    const hods = await User.find({ role: 'hod' })
      .populate('assignedDepartment', 'name')
      .select('-password');

    res.json(hods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all Teachers (admin and HOD)
// Register Student (by HOD or Teacher)
export const registerStudent = async (req, res) => {
  try {
    const { name, enrollmentId, email, phone, tempPassword, class: classId } = req.body || {};
    console.log("HOD/Teacher registerStudent API - input:", { name, enrollmentId, email, class: classId, userRole: req.user?.role });
    
    if (!name || !email || !tempPassword) {
      return res.status(400).json({ error: "name, email and tempPassword are required" });
    }

    // Password validation
    if (!tempPassword || tempPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.role === "admin" || existing.is_admin === true) {
        return res.status(409).json({ error: "This email is already used by admin account" });
      }
      return res.status(409).json({ error: "Student with this email already exists" });
    }

    // Check enrollment ID uniqueness
    if (enrollmentId) {
      const existingId = await User.findOne({ studentId: String(enrollmentId).trim() });
      if (existingId) return res.status(409).json({ error: "Enrollment ID already registered" });
    }

    // Get department and class info
    let departmentId, departmentObj;
    if (req.user.role === 'hod') {
      departmentId = req.user.assignedDepartment;
      departmentObj = await Department.findById(departmentId);
    } else if (req.user.role === 'teacher') {
      // Teacher can only register students for their assigned class
      if (!classId || classId !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: 'Teachers can only register students for their assigned class' });
      }
      const classObj = await Class.findById(classId).populate('department');
      if (!classObj) {
        return res.status(404).json({ error: 'Class not found' });
      }
      departmentId = classObj.department._id;
      departmentObj = classObj.department;
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      studentId: enrollmentId ? String(enrollmentId).trim() : undefined,
      password: tempPassword,
      phone: phone ? String(phone).trim() : undefined,
      department: departmentId,
      class: classId || undefined,
      role: "student",
      is_admin: false,
    });
    
    console.log("HOD/Teacher registerStudent API - created new student:", { _id: user._id, class: user.class, department: user.department });
    const { password: _, ...safe } = user.toObject();
    
    res.status(201).json({
      message: 'Student registered successfully',
      student: {
        ...safe,
        departmentName: departmentObj?.name,
        className: (await Class.findById(classId))?.name
      }
    });
  } catch (error) {
    console.error("HOD/Teacher registerStudent error:", error);
    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      const msg = messages[0] || "Invalid data";
      return res.status(400).json({ error: msg });
    }
    if (error?.code === 11000) {
      const pattern = error.keyPattern || {};
      if (pattern.email) {
        return res.status(409).json({ error: "Email already registered" });
      }
      if (pattern.studentId) {
        return res.status(409).json({ error: "Enrollment ID already registered" });
      }
      return res.status(409).json({ error: "Duplicate field value already exists" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get students list (for HOD and Teacher)
export const getStudents = async (req, res) => {
  try {
    const filter = { role: "student" };
    
    console.log("getStudents API - user:", {
      role: req.user?.role,
      assignedClass: req.user?.assignedClass,
      assignedDepartment: req.user?.assignedDepartment,
      queryClass: req.query.class
    });
    
    if (req.user.role === 'hod') {
      // HOD can see all students in their department
      filter.department = req.user.assignedDepartment;
    } else if (req.user.role === 'teacher') {
      // Teacher can only see students in their assigned class
      filter.class = req.user.assignedClass;
      console.log("Teacher using assigned class:", req.user.assignedClass);
    }

    // Additional filters from query params
    if (req.query.department && req.user.role === 'admin') {
      filter.department = req.query.department;
    }
    if (req.query.class && req.user.role !== 'teacher') {
      filter.class = req.query.class;
    }

    console.log("HOD/Teacher getStudents API - filter:", filter);
    
    const items = await User.find(filter)
      .select("-password")
      .populate("department class");
    
    console.log("HOD/Teacher getStudents API - found students:", items.length);
    res.json(items);
  } catch (error) {
    console.error("HOD/Teacher getStudents error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllTeachers = async (req, res) => {
  try {
    let query = { role: 'teacher' };
    
    // If HOD, only show teachers from their department
    if (req.user.role === 'hod') {
      query.assignedDepartment = req.user.assignedDepartment;
    }

    const teachers = await User.find(query)
      .populate('assignedDepartment', 'name')
      .populate('assignedClass', 'name year')
      .select('-password');

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
