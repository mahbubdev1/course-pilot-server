const express = require("express");
const app = express();
const cors = require("cors");
app.use(express.json());
app.use(cors());
require("dotenv").config();
const port = process.env.PORT || 5000;

// db connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m0yzu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    // Database & Collection Reference
    const database = client.db("coursePilot");
    const coursesCollection = database.collection("courses");

    // API Route to Add Data
    app.post("/student-course", async (req, res) => {
      const courseData = req.body;
      const result = await coursesCollection.insertOne(courseData);
      res.send(result);
    });
    app.get('/student-course/:email', async (req, res) => {
      const email = req.params.email;
      const result = await coursesCollection.find({ email: email }).toArray();
      res.send(result)
    });

    app.delete('/student-course/:id', async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid ID" });
      }

      try {
        const query = { _id: new ObjectId(id) };
        const result = await coursesCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          res.send({ success: true, message: "Course deleted successfully" });
        } else {
          res.status(404).send({ error: "Course not found" });
        }
      } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
}

run();

app.get("/", (req, res) => {
  res.send("Course Pilot Server Is Running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});