import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "online_voting_system_secret";

// Store OTPs in memory (in production, use Redis or database)
const otpStore = new Map();

// Email transporter configuration (only if email credentials are provided)
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  console.warn('Email credentials not provided. OTP functionality will be disabled.');
}

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email
async function sendOTPEmail(email, otp) {
  if (!transporter) {
    console.log(`OTP for ${email}: ${otp} (Email not configured - showing in console)`);
    return;
  }

  console.log(`sendOTPEmail: Sending email to ${email}`);
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OTP for Voting Verification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">🔐 OTP Verification</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Online Voting System</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin: 20px 0;">
          <h2 style="color: #333; margin-bottom: 20px;">Your One-Time Password</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px dashed #667eea;">
            <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${otp}</span>
          </div>
          <p style="color: #666; margin-top: 20px; font-size: 14px;">
            This OTP will expire in <strong>10 minutes</strong>.
          </p>
        </div>
        
        <div style="text-align: center; color: #888; font-size: 12px;">
          <p>If you didn't request this OTP, please ignore this email.</p>
          <p>Do not share this OTP with anyone for security reasons.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`sendOTPEmail: Email sent successfully to ${email}`);
  } catch (error) {
    console.error(`sendOTPEmail: Failed to send email to ${email}:`, error);
    throw error;
  }
}

// Password validation function (same as frontend)
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

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isAdmin = user.is_admin === true || user.role === "admin";
    const role = user.role || (isAdmin ? "admin" : "student");
    
    // Determine redirect based on role
    let redirect;
    switch (role) {
      case "admin":
        redirect = "/admin/dashboard";
        break;
      case "hod":
        redirect = "/hod/dashboard";
        break;
      case "teacher":
        redirect = "/teacher/dashboard";
        break;
      default:
        redirect = "/student/dashboard";
    }

    const token = jwt.sign(
      { id: user._id, role, is_admin: isAdmin },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({ role, redirect, token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error during login" });
  }
}

export async function logout(req, res) {
  return res.status(200).json({ message: "Logged out" });
}

export async function verifyToken(req, res) {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const user = await User.findById(userId).select("-password")
      .populate("department class")
      .populate("assignedDepartment", "name")
      .populate("assignedClass", "name year department")
      .populate({
        path: "assignedClass",
        populate: {
          path: "department",
          select: "name"
        }
      });
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ user });
  } catch (err) {
    console.error("verifyToken error:", err);
    return res.status(500).json({ error: "Server error verifying token" });
  }
}

export async function changePassword(req, res) {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "oldPassword and newPassword are required" });
    }

    // Validate new password using same validation as login
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isValid = await user.comparePassword(oldPassword);
    if (!isValid) return res.status(401).json({ error: "Current password is incorrect" });

    // Check if new password is same as old password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    user.password = String(newPassword);
    await user.save();

    return res.status(200).json({ ok: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ error: "Server error changing password" });
  }
}

export async function updateMe(req, res) {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { name, phone, avatarUrl } = req.body || {};
    const updates = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : "";
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl ? String(avatarUrl).trim() : "";

    const user = await User.findByIdAndUpdate(userId, updates, { new: true })
      .select("-password")
      .populate("department class")
      .populate("assignedDepartment", "name")
      .populate("assignedClass", "name year department")
      .populate({
        path: "assignedClass",
        populate: {
          path: "department",
          select: "name"
        }
      });
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error("updateMe error:", err);
    return res.status(500).json({ error: "Server error updating profile" });
  }
}

// Send OTP
export async function sendOTP(req, res) {
  try {
    const { email } = req.body || {};
    
    if (!email) {
      console.log("sendOTP: Email is required");
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    console.log(`sendOTP: Processing request for email: ${normalizedEmail}`);
    
    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });
    
    // For development: create a test user if not found
    if (!user && normalizedEmail === "test@student.com") {
      console.log(`sendOTP: Creating test user for ${normalizedEmail}`);
      try {
        user = new User({
          name: "Test Student",
          email: normalizedEmail,
          password: "test123",
          role: "student"
        });
        await user.save();
        console.log(`sendOTP: Test user created successfully`);
      } catch (createErr) {
        console.error(`sendOTP: Failed to create test user:`, createErr);
      }
    }
    
    if (!user) {
      console.log(`sendOTP: User not found for email: ${normalizedEmail}`);
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`sendOTP: User found: ${user.name} (${user.role})`);

    // Generate and store OTP
    const otp = generateOTP();
    const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    otpStore.set(normalizedEmail, {
      otp,
      expiryTime,
      attempts: 0
    });

    console.log(`sendOTP: Generated OTP: ${otp} for ${normalizedEmail}`);

    // Send OTP email
    try {
      await sendOTPEmail(normalizedEmail, otp);
      console.log(`sendOTP: Email sent successfully to ${normalizedEmail}`);
    } catch (emailError) {
      console.log(`sendOTP: Email failed, but OTP stored: ${emailError.message}`);
      // Continue even if email fails - OTP is stored for console testing
    }

    return res.status(200).json({ 
      message: "OTP sent successfully",
      email: normalizedEmail 
    });
    
  } catch (err) {
    console.error("sendOTP error:", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
}

// Reset Password
export async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body || {};
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP, and new password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    
    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Update user password
    user.password = newPassword;
    await user.save();

    console.log(`resetPassword: Password reset successfully for ${normalizedEmail}`);

    return res.status(200).json({ 
      message: "Password reset successfully"
    });
    
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
}
export async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if OTP exists and is valid
    const storedOTP = otpStore.get(normalizedEmail);

    if (!storedOTP) {
      return res.status(404).json({ error: "OTP not found or expired" });
    }

    // Check if OTP has expired
    if (Date.now() > storedOTP.expiryTime) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: "OTP has expired" });
    }

    // Check if OTP matches
    if (storedOTP.otp !== String(otp).trim()) {
      storedOTP.attempts = (storedOTP.attempts || 0) + 1;

      // Lock after 5 attempts
      if (storedOTP.attempts >= 5) {
        otpStore.delete(normalizedEmail);
        return res.status(429).json({ error: "Too many failed attempts. Please request a new OTP" });
      }

      return res.status(401).json({ error: "Invalid OTP" });
    }

    // OTP is valid, remove it from store
    otpStore.delete(normalizedEmail);

    return res.status(200).json({
      message: "OTP verified successfully",
      email: normalizedEmail
    });

  } catch (err) {
    console.error("verifyOTP error:", err);
    return res.status(500).json({ error: "Failed to verify OTP" });
  }
}
