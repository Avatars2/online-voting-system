import mongoose from "mongoose";

const deptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hod: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.models.Department || mongoose.model("Department", deptSchema);
