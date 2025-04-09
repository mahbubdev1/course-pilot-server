// server.js
const express = require("express");
const app = express();
const http = require("http"); // needed for Socket.IO
const { Server } = require("socket.io");
const server = http.createServer(app); // Socket.IO server
const port = process.env.PORT || 5000;
const cors = require("cors");
// app.use(express.json());
app.use(express.json({ limit: "10mb" })); // or higher if needed

app.use(cors());
const bcrypt = require("bcryptjs");
require("dotenv").config();
// db connection

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m0yzu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
const messageDataCollection = client.db("coursePilot").collection("messages");
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_FRONTEND, // or specify your frontend origin
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let onlineUsers = [];
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join", ({ email }) => {
    console.log("User joined:", email);
    if (!onlineUsers.includes(email)) {
      onlineUsers.push(email);
    }

    io.emit("onlineUsers", onlineUsers);
    socket.email = email;
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.email);
    onlineUsers = onlineUsers.filter((user) => user !== socket.email);
    io.emit("onlineUsers", onlineUsers);
  });
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
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
    // find all users
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // find a user
    app.get("/users/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    // update the photo
    app.put("/updatePhoto/:email", async (req, res) => {
      const { email } = req.params;
      const image = req.body.image;
      // console.log(image);
      const query = { email: email };
      const result = await userCollection.updateOne(query, {
        $set: { image: image },
      });
      // console.log(result, "87");
      res.send(result);
    });
    // post users on colletion
    // collect by provider

    app.post("/users", async (req, res) => {
      const data = req.body;
      // console.log(data, "97");
      const query = data.email;
      // console.log(query);

      const existingUser = await userCollection.findOne({ email: query });
      // console.log("Existing user:", existingUser);
      if (existingUser) {
        return;
      }

      const password = data?.password;

      if (!data?.image) {
        data.image =
          "https://i.ibb.co.com/Kzc49SVR/blue-circle-with-white-user-78370-4707.jpg";
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        data.password = hashedPassword;
      }
      const timestamp = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Dhaka",
      });
      const updateData = {
        ...data,
        role: "user",

        createdAt: timestamp,
      };
      const result = await userCollection.insertOne(updateData);
      console.log(result, "111");
      res.send(result);
    });

    // route for chatapp
    app.post("/messages/send/:id", async (req, res) => {
      const { id } = req.params;
      const messageData = req.body;
      console.log(messageData, "123");
      const senderEmail = messageData?.sender;
      const query = { email: senderEmail };
      const result1 = await userCollection.findOne(query);
      const senderId = result1?._id.toString();

      const receiverId = id;

      const finalData = {
        ...messageData,
        senderId: senderId,
        receiverId: receiverId,
      };
      // console.log(finalData, "130");
      const result = await messageDataCollection.insertOne(finalData);
      res.send(result);
    });
    app.get("/messages/:id", async (req, res) => {
      const { id } = req.params;
      const query = { senderId: id };
      const result = await messageDataCollection.find().toArray();
      res.send(result);
      console.log(result, "145");
    });

    // for chatbot
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

server.listen(port, () => {
  console.log(`Server running on port  ${port}`);
});
