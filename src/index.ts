import express from "express";
import cors from "cors";
import cartRoutes from "./routes/cartRoutes";
import productRoutes from "./routes/productRoutes";

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON
app.use(express.json());

// Routes
app.use("/cart", cartRoutes);
app.use('/products', productRoutes);

// Health Check
app.get("/", (req, res) => {
  res.send("Cart Service Running");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
