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
    const plateShareDb = client.db('plate_share_DB');
    const userCollection = plateShareDb.collection('users');
    const foodCollection = plateShareDb.collection('foods');
    const foodRequestCollection = plateShareDb.collection('food-requests');

    // ================== USERS APIs ==================

    app.get('/users', async (req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching users' });
      }
    });

    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });
      res.send({ role: user?.role?.toLowerCase() || 'user' });
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ message: 'User already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = { $set: { role: 'admin' } };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //
    app.delete('/users/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: true, message: error.message });
      }
    });

    // ================== STATISTICS APIs ==================

    // User-specific Stats
    app.get('/user-stats/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const totalAdded = await foodCollection.countDocuments({
          'donator.email': email,
        });
        const totalRequested = await foodRequestCollection.countDocuments({
          requesterEmail: email,
        });
        res.send({ totalAdded, totalRequested });
      } catch (error) {
        res.status(500).send({ message: 'Stats error' });
      }
    });

    // Admin-wide Stats
    app.get('/admin-stats', async (req, res) => {
      try {
        const totalUsers = await userCollection.countDocuments();
        const totalFoods = await foodCollection.countDocuments();
        const totalRequests = await foodRequestCollection.countDocuments();
        const completedDonations = await foodRequestCollection.countDocuments({
          status: 'delivered',
        });
        res.send({ totalUsers, totalFoods, totalRequests, completedDonations });
      } catch (error) {
        res.status(500).send({ message: 'Admin stats error' });
      }
    });

    // ================== FOODS APIs ==================

    app.post('/foods', async (req, res) => {
      const newFood = req.body;
      newFood.food_status = newFood.food_status || 'available';
      const result = await foodCollection.insertOne(newFood);
      res.send(result);
    });

    app.get('/foods', async (req, res) => {
      const { donatorEmail } = req.query;
      let query = {};
      if (donatorEmail) {
        query = { 'donator.email': donatorEmail };
      }
      const foods = await foodCollection.find(query).toArray();
      res.send(foods);
    });

    app.get('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const food = await foodCollection.findOne({ _id: new ObjectId(id) });
      res.send(food);
    });

    app.patch('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const quantity = parseInt(
        updateData.foodQuantityNumber || updateData.foodQuantity
      );
      const status = quantity <= 0 ? 'donated' : 'available';
      const updateDoc = {
        $set: {
          foodName: updateData.foodName,
          foodImage: updateData.foodImage,
          foodQuantityNumber: quantity,
          pickupLocation: updateData.pickupLocation,
          expireDate: updateData.expireDate,
          notes: updateData.notes,
          food_status: status,
        },
      };
      const result = await foodCollection.updateOne(
        { _id: new ObjectId(id) },
        updateDoc
      );
      res.send(result);
    });

    app.delete('/foods/:id', async (req, res) => {
      const result = await foodCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // ================== FOOD REQUESTS APIs ==================

    app.post('/food-request', async (req, res) => {
      const request = req.body;
      request.foodId = new ObjectId(request.foodId);
      request.status = 'pending';
      request.createdAt = new Date().toISOString();
      const result = await foodRequestCollection.insertOne(request);
      res.send(result);
    });

    // get all food req
    app.get('/food-request', async (req, res) => {
      try {
        const result = await foodRequestCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching requests' });
      }
    });

    app.get('/food-request/:foodId', async (req, res) => {
      const { foodId } = req.params;
      const requests = await foodRequestCollection
        .find({ foodId: new ObjectId(foodId) })
        .toArray();
      res.send(requests);
    });

    app.patch('/food-request/:id', async (req, res) => {
      const { id } = req.params;
      const result = await foodRequestCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: req.body }
      );
      res.send(result);
    });

    app.delete('/food-request/:id', async (req, res) => {
      const result = await foodRequestCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.get('/my-request/:email', async (req, res) => {
      const requests = await foodRequestCollection
        .find({ requesterEmail: req.params.email })
        .toArray();
      res.send(requests);
    });
  } finally {
    
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send(`Plate Share Server is Running`);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
