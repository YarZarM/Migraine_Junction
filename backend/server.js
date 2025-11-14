import dotenv from 'dotenv';
import app from './src/app.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Hello from Render!");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});