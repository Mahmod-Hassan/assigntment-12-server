const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lcblope.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  

// verify the token whether it is valid or not
function verifyJWT(req, res, next) {
    const validUser = req.headers.authorization;
    if (!validUser) {
        return res.status(401).send('unauthorized access');
    }
    const token = validUser.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send('forbidden');
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {

    // All Collection //
    const productCollection = client.db('resaleProducts').collection('products');
    const orderCollection = client.db('resaleProducts').collection('orders');
    const userCollection = client.db('resaleProducts').collection('users');
    const paymentCollection = client.db('resaleProducts').collection('payments');

    const verifyAdmin = async (req, res, next) => {
        const decodedEmail = req.decoded.email;
        const query = { email: decodedEmail };
        const user = await userCollection.findOne(query);
        if (user?.role !== 'admin') {
            return res.status(403).send({ message: 'forbidden access' })
        }
        next()
    }

    const verifySeller = async (req, res, next) => {
        const decodedEmail = req.decoded.email;
        const query = { email: decodedEmail };
        const user = await userCollection.findOne(query);
        if (!user?.verified) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        next();
    }
    // get all category name like- iphone, readmi, samsung
    app.get('/category', async (req, res) => {
        const query = {};
        const result = await productCollection.find(query).toArray();
        res.send(result);
    })

    // categorywise data load if user click on iphone category
    // then only iphone product will be show
    app.get('/category-products', async (req, res) => {
        const categoryName = req.query.category;
        const query = { category: categoryName };
        const result = await productCollection.find(query).toArray();
        res.send(result);
    })

    // seller can add product
    app.post('/add-product', verifyJWT, async (req, res) => {
        const product = req.body;
        const result = await productCollection.insertOne(product);
        res.send(result);
    })
    app.get('/my-products', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const result = await productCollection.find(query).toArray();
        res.send(result);
    })
    app.put('/product/:id', verifyJWT, verifySeller, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
            $set: {
                booked: 'booked'
            }
        }
        const result = await productCollection.updateOne(filter, updateDoc, options);
        res.send(result);
    })

    // in this route orders will set to orderCollection into the database
    app.post('/orders', async (req, res) => {
        const order = req.body;
        const result = await orderCollection.insertOne(order);
        res.send(result);
    })

    app.get('/my-orders', verifyJWT, async (req, res) => {
        const decodedEmail = req.decoded.email;
        const email = req.query.email;
        if (email !== decodedEmail) {
            return res.status(402).send({ message: 'forbidden' });
        }
        const query = { email: email }
        const orders = await orderCollection.find(query).toArray();
        res.send(orders);
    })

    app.delete('/delete-order/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await orderCollection.deleteOne(query);
        res.send(result);
    })
    // when user register he/she will be inserted in userCollection
    // if user already exist nothing changes  happened
    app.put('/users', async (req, res) => {
        const user = req.body;
        const email = req.query.email;
        const options = { upsert: true };
        const filter = { email: email };
        const updateDoc = {
            $set: user
        }
        const result = await userCollection.updateOne(filter, updateDoc, options);
        res.send(result);
    })

    // get user by email address
    app.get('/users/:email', verifyJWT, async (req, res) => {
        const decodedEmail = req.decoded.email;
        const email = req.params.email;
        if (email !== decodedEmail) {
            return res.status(402).send({ message: 'forbidden' });
        }
        const query = { email: email };
        const user = await userCollection.findOne(query);
        res.send(user);
    })

    app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
            $set: {
                role: 'admin'
            }
        };
        const results = await userCollection.updateOne(filter, updateDoc, options);
        res.send(results);
    })
    app.put('/users/seller/:id', verifyJWT, verifySeller, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
            $set: {
                verified: true
            }
        }
        const result = await userCollection.updateOne(filter, updateDoc, options);
        res.send(result);
    })

    // checking current user admin or not
    app.get('/users/admin/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        res.send({ isAdmin: user?.role === 'admin' })
    })

    // checking current user seller or not
    app.get('/users/seller/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        res.send({ isSeller: user?.user_type === 'seller' })
    })

    // get all buyers by checking user_type === 'buyer'
    app.get('/all-buyers', async (req, res) => {
        const userType = req.query.type;
        const query = { user_type: userType };
        const allBuyers = await userCollection.find(query).toArray();
        res.send(allBuyers);
    })

    // get all sellers by checking user_type === 'sellers' or not
    app.get('/all-sellers', async (req, res) => {
        const userType = req.query.type;
        const query = { user_type: userType };
        const allSellers = await userCollection.find(query).toArray();
        res.send(allSellers);
    })

    // we will delete buyer and seller by this route
    app.delete('/delete-user/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await userCollection.deleteOne(query);
        res.send(result);
    })

    app.delete('/delete-product/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await productCollection.deleteOne(query);
        res.send(result);
    })
    app.get('/payment-order/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const order = await orderCollection.findOne(query);
        res.send(order);
    })
    app.post('/payments', async (req, res) => {
        const payment = req.body;
        const result = await paymentCollection.insertOne(payment);
        const id = payment.orderId;
        const filter = { _id: ObjectId(id) };
        const updatedDoc = {
            $set: {
                paid: true
            }
        }
        const updatedResult = await orderCollection.updateOne(filter, updatedDoc);
        res.send(updatedResult);
    })
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
        const order = req.body;
        const price = order.price;
        const amount = price * 100;
        const paymentIntent = await stripe.paymentIntents.create({
            currency: 'usd',
            amount: amount,
            'payment_method_types': [
                'card'
            ]
        })
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    })
    // If a user register / googleSignIn/ Login then he will be given a token
    app.get('/jwt', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
            return res.send({ accessToken: token });
        }
        res.status(403).send({ accessToken: '' })
    })

}
run().catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('server is running')
})
app.listen(port, () => {
    console.log(`server running on port ${port}`)
})