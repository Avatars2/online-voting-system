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
      assignedDepartment: departmentId
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
        assignedDepartment: departmentId,
        department: department.name
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
