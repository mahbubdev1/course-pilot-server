const express = require("express");
const app = express();
const cors = require("cors");
app.use(express.json());
app.use(cors());
const bcrypt = require("bcryptjs");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { Configuration, OpenAIApi } = require("openai");
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
const userCollection = client.db("coursePilot").collection("Users");
const sessionCollection = client.db("coursePilot").collection("session");
const helpDeskCollection = client.db("coursePilot").collection("textUpload");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
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

    app.get("/student-course/:email", async (req, res) => {
      const email = req.params.email;
      const result = await coursesCollection.find({ email: email }).toArray();
      res.send(result);
    });
    app.get("/student-course", async (req, res) => {
      // const email = req.params.email;
      const result = await coursesCollection.find().toArray();
      res.send(result);
    });

    app.get("/student-courses/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await coursesCollection.findOne(query);
      res.send(result);
    });

    app.put("/student-courses/:id", async (req, res) => {
      const updateData = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const filter = {
        $set: updateData,
      };
      const result = await coursesCollection.updateOne(query, filter);
      res.send(result);
    });

    app.delete("/student-course/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid ID" });
      }

      try {
        const query = { _id: new ObjectId(id) };
        const result = await coursesCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/users/", async (req, res) => {
      const { email } = req.query;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // Help desk sirver side code start

    // ✅ Text Upload API (OUTSIDE try-finally)
    app.post("/Upload", async (req, res) => {
      const data = req.body;
      const result = await helpDeskCollection.insertOne(data);
      res.send(result);
    });

    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const { userId } = req.body;

      try {
        const post = await helpDeskCollection.findOne({
          _id: new ObjectId(id),
          likedBy: userId,
        });

        if (post) {
          return res
            .status(400)
            .send({ error: "You already liked this post!" });
        }

        await helpDeskCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $inc: { like: 1 },
            $push: { likedBy: userId },
          }
        );

        const updatedPost = await helpDeskCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(updatedPost);
      } catch (error) {
        res.status(500).send({ error: "Server error!" });
      }
    });

    app.get("/postData", async (req, res) => {
      const result = (await helpDeskCollection.find().toArray()).reverse();
      res.send(result);
    });

    //text dlete api
    app.delete("/postDelete/:id", async (req, res) => {
      const id = req.params.id;
      const queary = { _id: new ObjectId(id) };
      const result = await helpDeskCollection.deleteOne(queary);
      res.send(result);
    });

    // Help desk sirver side code end

    //open ai chat bode sirver
    // const configuration = new Configuration({
    //   apiKey: process.env.OPENAI_API_KEY,
    // });
    // const openai = new OpenAIApi(configuration);

    // app.post("/api/chat", async (req, res) => {
    //   const { message } = req.body;

    //   try {
    //     const completion = await openai.createChatCompletion({
    //       model: "gpt-3.5-turbo", // or "gpt-4"
    //       messages: [{ role: "user", content: message }],
    //     });

    //     res.json({ reply: completion.data.choices[0].message.content });
    //   } catch (error) {
    //     console.error("OpenAI Error:", error.message);
    //     res.status(500).json({ error: "OpenAI API error" });
    //   }
    // });

    // post users on colletion
    // collect by provider

    app.post("/users", async (req, res) => {
      const data = req.body;
      const password = data?.password;
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      if (!data?.image) {
        data.image =
          "https://i.ibb.co.com/Kzc49SVR/blue-circle-with-white-user-78370-4707.jpg";
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      data.password = hashedPassword;
      const timestamp = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Dhaka",
      });
      const updateData = {
        ...data,
        role: "user",

        createdAt: timestamp,
      };
      const result = await userCollection.insertOne(updateData);
      res.send(result);
    });

    app.get("/", async (req, res) => {
      res.send("course pilot is firing");
    });
    // Tareq's code
    // for add a live session
    app.post("/live-sessions", async (req, res) => {
      const data = req.body;
      const result = await sessionCollection.insertOne(data);
      res.send(result);
    });
    // get live session
    app.get("/live-sessions", async (req, res) => {
      const result = await sessionCollection.find().toArray();
      res.send(result);
    });

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
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // find a user is exist or no
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
