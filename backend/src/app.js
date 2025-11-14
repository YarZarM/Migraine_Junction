import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/predict.js';
import userroutes from './routes/userroutes.js'

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api', routes);
app.use("/api", userroutes);

export default app;
