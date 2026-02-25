import express from "express";
// import { pool } from "./db";
import identifyRouter from "./routes/identify";

const app = express();
app.use(express.json());
app.use("/", identifyRouter);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});