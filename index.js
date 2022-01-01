const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// middle ware
app.use(cors());
app.use(express.json());

const { MongoClient } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pqspl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    const database = client.db("hero_rider");
    const userCollection = database.collection("users");

    // post the user data to the database
    app.post("/users", async (req, res) => {
      const userData = req.body;
      const result = await userCollection.insertOne(userData);
      res.send(result);
    });

    // get the users data
    app.get("/users/:email", async (req, res) => {
      const userEmail = req.params.email;
      const filter = { email: userEmail };
      const result = await userCollection.findOne(filter);
      res.send(result);
    });

    // make a user admin
    app.put("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // is user admin
    app.get("/isadmin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await userCollection.findOne(filter);
      let isAdmin = false;
      if (result?.role === "admin") {
        isAdmin = true;
      }
      res.send({ admin: isAdmin });
    });

    // get all the user
    app.get("/users", async (req, res) => {
      const page = req.query.page;
      const size = Number(req.query.size);
      const result = userCollection.find({});
      let users;
      const count = await result.count();
      if (page) {
        users = await result
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        users = await result.toArray();
      }

      res.send({ count, users });
    });

    // get ordered car object
    app.get("/order/:id", async (req, res) => {
      const orderId = req.params.id;
      const filter = { _id: ObjectId(orderId) };
      const result = await userCollection.findOne(filter);
      res.send(result);
    });

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // update order details
    app.put("/order/:id", async (req, res) => {
      const orderId = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(orderId) };
      const updateDoc = {
        $set: {
          payment: payment,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // block a user
    app.put("/user/block/:id", async (req, res) => {
      const userId = req.params.id;
      const filter = { _id: ObjectId(userId) };
      const updateDoc = {
        $set: {
          isBlocked: "blocked",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // find blocked user
    app.get("/find/:email", async (req, res) => {
      const userEmail = req.params.email;
      const filter = { email: userEmail };
      const result = await userCollection.findOne(filter);
      res.send(result);
    });

    console.log("connected");
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
