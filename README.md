Bitespeed Backend Task – Identity Reconciliation


This project implements the Identity Reconciliation backend service for Bitespeed.

The goal is to identify and link customer identities across multiple purchases using either:
- `email`
- `phoneNumber`

The service exposes a single endpoint:

POST /identify --->   It returns a consolidated view of a customer’s contact information.

Hosted API:  https://bitespeed-backend-task-rqy1.onrender.com/


Tech Stack used :

- Node.js
- TypeScript
- Express
- PostgreSQL
- Docker

--> Database Schema :

CREATE TABLE Contact (
  id SERIAL PRIMARY KEY,
  phoneNumber VARCHAR(20),
  email VARCHAR(255),
  linkedId INT REFERENCES Contact(id),
  linkPrecedence VARCHAR(10) CHECK (linkPrecedence IN ('primary','secondary')),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP
);

-> Running Locally with Docker

1. Start PostgreSQL

docker run --name bitespeed-postgres \
-e POSTGRES_USER=xxxx \
-e POSTGRES_PASSWORD=yyyy \
-e POSTGRES_DB=bitespeed \
-p 5432:5432 \
-d postgres:15

2. Set Environment Variable
Create .env:

DATABASE_URL=postgresql://xxxx:yyyy@localhost:5432/bitespeed

3. Install Dependencies

npm install

4. Run Development Server
npm run dev

Server runs on:

http://localhost:3000
