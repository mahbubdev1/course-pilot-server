// server.js
const express = require("express");
const app = express();
const port = 5000;
const cors = require("cors");
const { connectToDB } = require("./database/db");
// Middleware to handle JSON requests
app.use(express.json());
app.use(cors());
require("dotenv").config();
// db connection
async function startServer() {
  // Connect to MongoDB
  await connectToDB();

  console.log("Server is starting...");
}

app.listen(port, () => {
  console.log(`Server running on port  ${port}`);
});
