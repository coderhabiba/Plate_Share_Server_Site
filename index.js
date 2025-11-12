const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;
const dotenv = require('dotenv');

dotenv.config();

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json());

// mongodb uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sugbz4l.mongodb.net/?appName=Cluster0`;

// MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    const plateShareDb = client.db('plate_share_DB');
    const userCollection = plateShareDb.collection('users');
    const foodCollection = plateShareDb.collection('foods');
    const foodRequestCollection = plateShareDb.collection('food-requests');

    // get users
    app.get('/users', async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    });

    // post user
    app.post('/users', async (req, res) => {
      const newUser = req.body;
      const email = newUser.email;
      const query = { email: email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.status(409).send({ message: 'User already exists' });
      }
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    // add food
    app.post('/foods', async (req, res) => {
      try {
        const newFood = req.body;
        if (!newFood.donator || !newFood.donator.email) {
          return res.status(400).send({ message: 'Donator info missing' });
        }
        newFood.food_status = newFood.food_status || 'Available';
        const result = await foodCollection.insertOne(newFood);
        res.send(result);
      } catch (error) {
        console.error('Error adding food:', error);
      }
    });

    // get all foods and my added foods also
    app.get('/foods', async (req, res) => {
      try {
        const { donatorEmail } = req.query;
        let query = {};
        if (donatorEmail) {
          query = { 'donator.email': donatorEmail };
        }
        const foods = await foodCollection.find(query).toArray();
        res.send(foods);
      } catch (error) {
        console.error('Error fetching foods:', error);
      }
    });

    // fodd details
    app.get('/foods/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const food = await foodCollection.findOne({ _id: new ObjectId(id) });
        res.send(food);
      } catch (error) {
        console.error('Error fetching food:', error);
      }
    });

    // update food by id
    app.put('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const updatedFood = req.body;
      try {
        const result = await foodCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedFood }
        );
        res.send(result);
      } catch (error) {
        console.error(error);
      }
    });

    //  delete a food by id
    app.delete('/foods/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await foodCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error(error);
      }
    });

    //post food req
    app.post('/food-request', async (req, res) => {
      try {
        const request = req.body;
        request.foodId = new ObjectId(request.foodId);
        request.status = 'pending';
        request.createdAt = new Date().toISOString();
        const result = await foodRequestCollection.insertOne(request);
        res.send(result);
      } catch (err) {
        console.error(err);
      }
    });

    //food req by id
    app.get('/food-request/:foodId', async (req, res) => {
      try {
        const { foodId } = req.params;
        if (!ObjectId.isValid(foodId))
          return res.status(400).send({ message: 'Invalid food ID' });
        const requests = await foodRequestCollection.find({ foodId: new ObjectId(foodId) }).toArray();
        res.send(requests);
      } catch (err) {
        console.error(err);
      }
    });

    // update request status
    app.patch('/food-request/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid ID' });
        }

        const query = { _id: new ObjectId(id) };
        const updateDoc = { $set: updatedData };

        const result = await foodRequestCollection.updateOne(query, updateDoc);

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'No document updated' });
        }

        const updatedRequest = await foodRequestCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(updatedRequest);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Server Error', error });
      }
    });


    // my food req manage
    app.delete('/food-request/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await foodRequestCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 1) {
          res.send(result);
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Get all requests made by a specific user
    app.get('/my-request/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const requests = await foodRequestCollection.find({requesterEmail: email}).toArray();
        res.send(requests);
      } catch (err) {
        console.error(err)
      }
    });
    
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
    
  } catch(error) {
    console.error('Failed to connect to MongoDB or start server:', error);
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send(`Plate Share Server Running on ${port}`);
});


