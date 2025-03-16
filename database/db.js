// /db/mongo.js
const { MongoClient, ServerApiVersion } = require("mongodb");

// Define the MongoDB URI
require("dotenv").config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0sbt0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient instance
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Function to connect to MongoDB
async function connectToDB() {
  try {
    // Connect to the MongoDB server
    await client.connect();
    // Send a ping to confirm connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

// Export the client and connection function
module.exports = { client, connectToDB };
