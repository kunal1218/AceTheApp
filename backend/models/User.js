import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String, // hashed
  myColleges: [String], // array of college IDs
  collegeDocs: { type: Map, of: String }, // { collegeId: docUrl }
  surveyAnswers: { type: Array, default: () => Array(10).fill(null) }, // array of 10 survey answers
  assignmentAnswers: { type: Array, default: () => Array(4).fill("") }, // array of 4 assignment answers
  usaMapClickedChain: { type: [String], default: [] }, // array of state/clicked IDs
  collegeProgress: { type: Object, default: {} }, // { collegeId: { ...progressObj } }
});
export default mongoose.model("User", userSchema);