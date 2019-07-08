const express = require('express');
const session = require('express-session');
const app = express();

const redis = require('redis');
const redisStore = require('connect-redis')(session);
const client  = redis.createClient();

const logger = require('morgan');
const bodyParser = require('body-parser');

const handlers = require('./handlers');
const {handleGET, handlePOST, handleGETByID, handlePATCH} = handlers;

const port = 8080;


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: 'ssshhhhh',
    store: new redisStore({ host: 'localhost', port: 8000, client: client, ttl :  260}),
    saveUninitialized: false,
    resave: false
}));

app.post('/api/notes', (req, res) => {
    handlePOST(req, res, client);
});

app.get('/api/notes', (req, res) => {
    handleGET(res, client);
});

app.get('/api/notes/:id', (req, res) => {
    handleGETByID(req, res, client);    
});

app.patch('/api/notes/:id', (req, res) => {
    handlePATCH(req, res, client);    
});

app.listen(port, () => {
    console.log(`Listening to ${port}`)
});
