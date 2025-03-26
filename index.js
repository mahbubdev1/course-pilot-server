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
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7utxc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const quizQuestionCollection = client.db("coursePilot").collection("todayExam");

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
    app.get('/student-course', async (req, res) => {
      // const email = req.params.email;
      const result = await coursesCollection.find().toArray();
      res.send(result)
    });

    app.get('/student-courses/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await coursesCollection.findOne(query);
      res.send(result);
    });

    app.put('/student-courses/:id', async (req, res) => {
      const updateData = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const filter = {
        $set: updateData
      }
      const result = await coursesCollection.updateOne(query, filter);
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
        res.send(result)
      } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    // Tareq's code

    app.get("/todayExam", async (req, res) => {
      const result = await quizQuestionCollection.find().toArray();
      res.send(result);
    });
    // post for todayExam route
    app.post("/todayExam", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await quizQuestionCollection.insertOne(data);
      res.send(result);
    });
    // patch for update quiz question
    app.patch("/updateAnswer/:id", async (req, res) => {
      const { id } = req.params;
      const updateOption = req.body.answer;
      const query = { _id: new ObjectId(id) };
      const result = await quizQuestionCollection.updateOne(query, {
        $set: { answer: updateOption },
      });
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run();

app.get("/", (req, res) => {
  res.send("Course Pilot Server Is Running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});