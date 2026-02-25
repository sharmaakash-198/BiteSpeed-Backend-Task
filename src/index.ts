import express from "express";
import identifyRouter from "./routes/identify";

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use("/", identifyRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
