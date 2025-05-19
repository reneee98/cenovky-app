import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// User schema
export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Meno je povinné'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'E-mail je povinný'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Prosím zadajte platný email'],
  },
  password: {
    type: String,
    required: [true, 'Heslo je povinné'],
    minlength: [6, 'Heslo musí mať minimálne 6 znakov'],
    select: false, // default query won't include password
  }
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  const user = this;

  if (!user.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export const User = mongoose.model<IUser>('User', userSchema); 