const express = require("express");
const app = express();
const cors = require("cors");
const SSLCommerzPayment = require("sslcommerz-lts");
app.use(express.json());
app.use(cors());
const bcrypt = require("bcryptjs");
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
const userCollection = client.db("coursePilot").collection("Users");
const sessionCollection = client.db("coursePilot").collection("session");
const paymentCollection = client.db("coursePilot").collection("payment");

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false;

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

    // =========== Payment gateway ===========
    app.post("/payment", async (req, res) => {
      // console.log(req.body);
      const tran_id = new ObjectId().toString();
      const { courseId, price, name, address, post, phone, currency } =
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
