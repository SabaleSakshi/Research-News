import express, { urlencoded } from "express";
import dotenv from "dotenv";
import { ResearchAndNewsTool } from "./ResearchAndNewsTool.js";
import cors from "cors";

dotenv.config();

const app=express();
const PORT=process.env.PORT || 3000;
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(urlencoded({ extended: true }));

app.post("/research-news", async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  const result = await ResearchAndNewsTool.func({ topic });
  res.json({ result });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});