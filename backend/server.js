import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import assessmentRoutes from './routes/assessments.js';
import questionRoutes from './routes/questions.js';
import resultRoutes from './routes/results.js';
import studentRoutes from './routes/students.js';
import facultyRoutes from './routes/faculty.js';
import departmentRoutes from './routes/departments.js';
import messageRoutes from './routes/messages.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'SmartAssess API is running 🚀' });
});

app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/messages', messageRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SmartAssess backend running on http://localhost:${PORT}`);
});
