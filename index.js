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
    const bookingCollection = client.db('resaleProducts').collection('bookings');

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
    app.post('/bookings', async (req, res) => {
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking);
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