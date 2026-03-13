// Fix existing HOD users - set department field to assignedDepartment
import User from './models/User.js';
import mongoose from 'mongoose';

async function fixHodDepartments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ovs');
    
    // Find all HOD users who have assignedDepartment but no department
    const hods = await User.find({ 
      role: 'hod', 
      assignedDepartment: { $exists: true, $ne: null },
      department: { $exists: false }
    });
    
    console.log(`Found ${hods.length} HOD users to fix`);
    
    for (const hod of hods) {
      hod.department = hod.assignedDepartment;
      await hod.save();
      console.log(`Fixed HOD: ${hod.name} (${hod.email}) - Department: ${hod.assignedDepartment}`);
    }
    
    console.log('All HOD users have been fixed!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing HOD departments:', error);
    process.exit(1);
  }
}

fixHodDepartments();
