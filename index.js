const express = require('express');
const corse = require('corse');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;
const dotenv = require('dotenv');

dotenv.config();

// Middleware
app.use(corse());
app.use(express.json());

// mongodb uri
const uri ='mongodb+srv://<db_username>:<db_password>@cluster0.sugbz4l.mongodb.net/?appName=Cluster0';

// MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {
  try {
    // Connect the client to the server	
    await client.connect();
    
    

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // 
  }
}
run().catch(console.dir);






app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});