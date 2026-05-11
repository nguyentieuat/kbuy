// src/index.ts

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
import type { Request, Response } from "express";


const bannersRoutes = require('./routes/banners.route');
const categoriesRoutes = require('./routes/categories.route');
const productsRoutes = require('./routes/products.route');
const otpRoutes = require("./routes/otp.route");
const orderRoutes = require("./routes/order.route");


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/banners', bannersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", orderRoutes);

app.use("/api/otp", otpRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});