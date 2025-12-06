import express from 'express';
import cartRoutes from './routes/cartRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/cart', cartRoutes);

// Health Check
app.get('/', (req, res) => {
  res.send('Cart Service Running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
