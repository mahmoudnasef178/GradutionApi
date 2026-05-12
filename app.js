require('dotenv/config');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');

// Swagger Setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Graduation Project API',
            version: '1.0.0',
            description: 'API Documentation',
        },
        servers: [
            { url: 'http://localhost:3000/api/v1' }
        ],
    },
    apis: ['./routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors());
app.options('*', cors());

// Middlewares
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('tiny'));
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));
app.use(errorHandler);

const api = process.env.API_URL;

// Routes
const categoriesRoute = require('./routes/categories');
const productRoute    = require('./routes/products');
const userRoute       = require('./routes/users');
const orderRoute      = require('./routes/orders');
const favoritesRoutes = require('./routes/favorite');
const cartRoute       = require('./routes/cart');

app.use(`${api}/products`,   productRoute);
app.use(`${api}/categories`, categoriesRoute);
app.use(`${api}/users`,      userRoute);
app.use(`${api}/Order`,      orderRoute);
app.use(`${api}/Favorite`,   favoritesRoutes);
app.use(`${api}/cart`,       cartRoute);

// Database Connection
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
    useFindAndModify:   false
}).then(() => {
    console.log("Successfully connected to the database");
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err);
    process.exit();
});

app.listen(3000, () => {
    console.log("Server is listening on port 3000");
});