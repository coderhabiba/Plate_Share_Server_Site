const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })
);
app.use(express.json());

// uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sugbz4l.mongodb.net/?appName=Cluster0`;

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

    const plateShareDb = client.db('plate_share_DB');
    const userCollection = plateShareDb.collection('users');
    const foodCollection = plateShareDb.collection('foods');
    const foodRequestCollection = plateShareDb.collection('food-requests');

    // users
    app.get('/users', async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send({ message: 'Server error fetching users' });
      }
    });

    app.post('/users', async (req, res) => {
      try {
        const newUser = req.body;
        const existingUser = await userCollection.findOne({
          email: newUser.email,
        });
        if (existingUser) {
          return res.status(409).send({ message: 'User already exists' });
        }
        const result = await userCollection.insertOne(newUser);
        res.send(result);
      } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send({ message: 'Server error adding user' });
      }
    });

    // foods
    app.post('/foods', async (req, res) => {
      try {
        const newFood = req.body;
        if (!newFood.donator || !newFood.donator.email) {
          return res.status(400).send({ message: 'Donator info missing' });
        }
        newFood.food_status = newFood.food_status || 'available';
        const result = await foodCollection.insertOne(newFood);
        res.send(result);
      } catch (error) {
        console.error('Error adding food:', error);
        res.status(500).send({ message: 'Server error adding food' });
      }
    });

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
        res.status(500).send({ message: 'Server error fetching foods' });
      }
    });

    app.get('/foods/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const food = await foodCollection.findOne({ _id: new ObjectId(id) });
        res.send(food);
      } catch (error) {
        console.error('Error fetching food:', error);
        res.status(500).send({ message: 'Server error fetching food' });
      }
    });

    // update food
    app.put('/foods/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedFood = req.body;
        const result = await foodCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedFood }
        );
        res.send(result);
      } catch (error) {
        console.error('Error updating food:', error);
        res.status(500).send({ message: 'Server error updating food' });
      }
    });

    // update food status only
    app.patch('/foods/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { food_status } = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid food ID' });
        }

        const result = await foodCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { food_status } }
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: 'Food not found or already updated' });
        }

        res.send({ message: 'Food status updated successfully' });
      } catch (error) {
        console.error('Error updating food status:', error);
        res.status(500).send({ message: 'Server error updating food status' });
      }
    });

    // delete food
    app.delete('/foods/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await foodCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        console.error('Error deleting food:', error);
        res.status(500).send({ message: 'Server error deleting food' });
      }
    });

    // food requests
    app.post('/food-request', async (req, res) => {
      try {
        const request = req.body;
        request.foodId = new ObjectId(request.foodId);
        request.status = 'pending';
        request.createdAt = new Date().toISOString();

        const result = await foodRequestCollection.insertOne(request);
        res.send(result);
      } catch (err) {
        console.error('Error creating request:', err);
        res.status(500).send({ message: 'Server error creating request' });
      }
    });

    app.get('/food-request/:foodId', async (req, res) => {
      try {
        const { foodId } = req.params;
        if (!ObjectId.isValid(foodId)) {
          return res.status(400).send({ message: 'Invalid food ID' });
        }

        const requests = await foodRequestCollection
          .find({ foodId: new ObjectId(foodId) })
          .toArray();

        res.send(requests);
      } catch (err) {
        console.error('Error fetching food requests:', err);
        res
          .status(500)
          .send({ message: 'Server error fetching food requests' });
      }
    });

    // update food request status
    app.patch('/food-request/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: 'Invalid request ID' });
        }

        const result = await foodRequestCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'No document updated' });
        }

        const updatedRequest = await foodRequestCollection.findOne({
          _id: new ObjectId(id),
        });

        res.send(updatedRequest);
      } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).send({ message: 'Server error updating request' });
      }
    });

    // delete food request
    app.delete('/food-request/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const result = await foodRequestCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (err) {
        console.error('Error deleting request:', err);
        res.status(500).send({ message: 'Server error deleting request' });
      }
    });

    // get all requests by specific user 
    app.get('/my-request/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const requests = await foodRequestCollection
          .find({ requesterEmail: email })
          .toArray();
        res.send(requests);
      } catch (err) {
        console.error('Error fetching user requests:', err);
        res
          .status(500)
          .send({ message: 'Server error fetching user requests' });
      }
    });

    // start server 
    app.listen(port, () => {
      console.log(`Plate Share Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB or start server:', error);
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send(`Plate Share Server Running on port ${port}`);
});
