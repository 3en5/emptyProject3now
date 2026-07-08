import 'dotenv/config'; // טוען משתני סביבה מקובץ .env (למשל ANTHROPIC_API_KEY)
import { init } from './db/init.js';
import { createApp } from './app.js';

const PORT = process.env.PORT || 3018;
const app = createApp();

// Initialize database and start server
init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });
