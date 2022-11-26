const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lcblope.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    // All Collection //
    const categoryCollection = client.db('resaleProducts').collection('categories');
    const productCollection = client.db('resaleProducts').collection('products');
    const orderCollection = client.db('resaleProducts').collection('orders');
    const userCollection = client.db('resaleProducts').collection('users');

    app.get('/categories', async (req, res) => {
        const query = {};
        const result = await categoryCollection.find(query).toArray();
        res.send(result);
    })
    app.get('/category/:id', async (req, res) => {
        const id = req.params.id;
        const query = { category_id: id };
        const result = await productCollection.find(query).toArray();
        res.send(result);
    })
    app.post('/orders', async (req, res) => {
        const order = req.body;
        const result = await orderCollection.insertOne(order);
        res.send(result);
    })
    app.get('/orders', async (req, res) => {
        const email = req.query.email;
        console.log(email);
        const query = { email: email }
        const orders = await orderCollection.find(query).toArray();
        res.send(orders);
    })
    app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await userCollection.insertOne(user);
        res.send(result);
    })

}
run().catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('server is running')
})
app.listen(port, () => {
    console.log(`server running on port ${port}`)
})