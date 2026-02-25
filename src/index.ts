import express from "express";
import identifyRouter from "./routes/identify";
import { pool } from "./db";

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use("/", identifyRouter);


//creating table contact if not exists
async function createTableIfNotExists() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Contact (
        id SERIAL PRIMARY KEY,
        phoneNumber VARCHAR(20),
        email VARCHAR(255),
        linkedId INT REFERENCES Contact(id),
        linkPrecedence VARCHAR(10) CHECK (linkPrecedence IN ('primary','secondary')),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deletedAt TIMESTAMP
      );
  
      CREATE INDEX IF NOT EXISTS idx_email ON Contact(email);
      CREATE INDEX IF NOT EXISTS idx_phone ON Contact(phoneNumber);
    `);

    console.log("Contact table ensured");
}

createTableIfNotExists();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
