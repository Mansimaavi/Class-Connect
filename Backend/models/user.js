import mongoose from 'mongoose';
const activitySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  logins: { type: Number, default: 0 },
  totalTimeSpent: { type: Number, default: 0 },
});

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String,required: true,unique: true,
      match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'],
    },
    password: { type: String, required: true, minlength: 8 },
    course: { type: String, required: true },
    college: { type: String, required: true },
    token: { type: String },
    resetPasswordExpires: { type: Date },
    image: { type: String, required: false },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: "user"},
    createdBySuperAdmin: { type: Boolean, default: false},
    lastLogin: { type: Date, default: Date.now }, 
    createdAt: { type: Date, default: Date.now }, 
    activityLog: [activitySchema],
    sessionStart: { type:Date },
    isBlocked: { type: Boolean, default: false }, 
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;



