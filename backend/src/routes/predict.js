import { Router } from 'express';
import { runPrediction, getLatestPrediction } from '../controllers/predictcontroller';

const router = Router();

// Trigger ML prediction workflow (internal)
router.post('/predict', runPrediction);

// Return latest prediction for app
router.get('/v1/latest', getLatestPrediction);

export default router;

