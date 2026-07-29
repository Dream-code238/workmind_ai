import express from "express";
import { cache } from "../services/cache.js";

const router = express.Router();

const startTime = Date.now();

router.get("/", (req, res) => {
  res.json({
    status: "healthy",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    cache: cache.getStats(),
    version: "1.0.0",
  });
});

router.get("/live", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

export default router;
