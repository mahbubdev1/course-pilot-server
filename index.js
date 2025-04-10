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
const SSLCommerzPayment = require("sslcommerz-lts");
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
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
const messageDataCollection = client.db("coursePilot").collection("messages");
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_FRONTEND, // or specify your frontend origin
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const paymentCollection = client.db("coursePilot").collection("payment");

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false;
const helpDeskCollection = client.db("coursePilot").collection("textUpload");

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
    await client.connect();
    console.log("Connected to MongoDB!");

    // Database & Collection Reference
    const database = client.db("coursePilot");
    const coursesCollection = database.collection("courses");
    const notesCollection = database.collection("notes");
    const noteCollection = database.collection("note");

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

    // app.get("/student-courses/:id", async (req, res) => {
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

    app.get("/student-certificate/:email", async (req, res) => {
      const email = req.params.email;
      const result = await coursesCollection
        .find({ email: email, certificateStatus: "approve" })
        .toArray();
      res.send(result);
    });

    app.patch("/student-courses/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const { certificateStatus, status } = req.body;
      const updateDoc = {
        $set: { certificateStatus, status }
      };
      const result = await coursesCollection.updateOne(filter, updateDoc);
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

    // app.delete("/student-course/:id", async (req, res) => {
    //     $set: updateData

    //   const result = await coursesCollection.updateOne(query, filter);
    //   res.send(result);
    // });

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

    // Notes

    app.post("/notes", async (req, res) => {
      const notesData = req.body;
      const result = await notesCollection.insertOne(notesData);
      res.send(result);
    });

    app.get("/notes/:courseTitle/:videoIndex", async (req, res) => {
      const { courseTitle, videoIndex } = req.params;
      const result = await notesCollection
        .find({
          coursesTitle: courseTitle,
          videoIndex: parseInt(videoIndex),
        })
        .toArray();
      res.send(result);
    });

    app.patch("/notes/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedNote = req.body;
        const result = await notesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedNote }
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating note:", error);
        res.status(500).send({ error: "Failed to update note" });
      }
    });

    app.delete("/notes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await notesCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const { email } = req.query;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get("/users/role/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      if (result) {
        res.send({ role: result.role });
      } else {
        res.send({ role: null });
      }
    });


    app.get("/manageUsers", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.patch('/manageUsers/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { role } = req.body;
      const updateDoc = {
        $set: { role }
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result)
    })

    app.delete("/manageUsers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result)
    });

    // payment history

    // app.post('/payment-history', async (req, res) => {
    //   const paymentData = req.data;
    //   const result = await paymentCollection.insertOne(paymentData);
    //   res.send(result)
    // });

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
      const { email } = req.params;}

    // =========== Payment gateway ===========
    app.post("/payment", async (req, res) => {
      console.log(req.body);
      const tran_id = new ObjectId().toString();
      const { courseId, price, name, address, post, phone, currency, email } =
        req.body;

      const data = {
        total_amount: price,
        currency: currency,
        tran_id: tran_id, // use unique tran_id for each API call
        success_url: `http://localhost:5000/payment/success/${tran_id}`,
        fail_url: "http://localhost:3030/fail",
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: "Customer Name",
        cus_email: "customer@example.com",
        cus_add1: address,
        cus_add2: address,
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: phone,
        cus_fax: phone,
        ship_name: name,
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: post,
        ship_country: "Bangladesh",
      };

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

      sslcz.init(data).then(async (apiResponse) => {
        // Save payment data in MongoDB
        const paymentData = {
          email: email,
          tran_id: tran_id,
          courseId: courseId,
          price: price,
          name: name,
          address: address,
          post: post,
          phone: phone,
          currency: currency,
          status: "Pending",
        };

        // Insert payment data into MongoDB
        await paymentCollection.insertOne(paymentData);

        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        // console.log("Redirecting to: ", GatewayPageURL);
      });

      app.post("/payment/success/:id", async (req, res) => {
        const tran_id = req.params.id;

        try {
          // Find the payment in MongoDB
          const payment = await paymentCollection.findOne({ tran_id: tran_id });

          if (!payment) {
            return res.status(404).send("Payment not found");
          }

          // Update the payment status to 'Success'
          const result = await paymentCollection.updateOne(
            { tran_id: tran_id },
            { $set: { status: "Success" } }
          );

          if (result.modifiedCount > 0) {
            // Redirect to the success page with the transaction ID
            res.redirect(`http://localhost:3000/payment-success/${tran_id}`);
          } else {
            res.status(400).send("Failed to update payment status");
          }
        } catch (error) {
          console.error("Error processing payment:", error);
          res.status(500).send("Internal Server Error");
        }
      });

      app.post("/payment/fail/:id", async (req, res) => {
        const tran_id = req.params.id;

        try {
          // Find the payment in MongoDB
          const payment = await paymentCollection.findOne({ tran_id: tran_id });

          if (!payment) {
            return res.status(404).send("Payment not found");
          }

          // Update the payment status to 'Failed'
          const result = await paymentCollection.updateOne(
            { tran_id: tran_id },
            { $set: { status: "Failed" } }
          );

          if (result.modifiedCount > 0) {
            // Redirect to the fail page with the transaction ID
            res.redirect(`http://localhost:3000/payment-fail/${tran_id}`);
          } else {
            res.status(400).send("Failed to update payment status");
          }
        } catch (error) {
          console.error("Error processing payment failure:", error);
          res.status(500).send("Internal Server Error");
        }
      });
    });
    app.get('/payments', async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result)
    })

    // API route to handle POST note
    app.post("/note", async (req, res) => {
      const noteData = req.body;
      const result = await noteCollection.insertOne(noteData);
      res.send(result);
    });

    // Search notes by title
    app.get("/search-notes", async (req, res) => {
      const { title } = req.query;
      const query = title ? { title: { $regex: title, $options: "i" } } : {};
      const result = await noteCollection.find(query).toArray();
      res.send(result);
    });

    // get all note posted by a specific user
    app.get("/note-users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await noteCollection.find(query).toArray();
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

    // Update a note in db
    app.put("/note-update/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // First validate the ID
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: "Invalid ID format" });
        }

        const updatedNote = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            ...updatedNote,
          },
        };

        const result = await noteCollection.updateOne(query, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Note not found" });
        }

        res.send(result);
      } catch (err) {
        console.error("Error updating note:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Cancel/delete a note
    app.delete("/note-delete/:id", async (req, res) => {
      const id = req.params.id;

      // Ensure the id is valid
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid ObjectId format" });
      }

      // Convert to ObjectId and perform the delete
      const query = { _id: new ObjectId(id) };
      const result = await noteCollection.deleteOne(query);
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
run().catch(console.dir);

server.listen(port, () => {
  console.log(`Server running on port  ${port}`);
});
// });
