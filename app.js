const express = require('express');
const session = require('express-session');
const app = express();

const redis = require('redis');
const redisStore = require('connect-redis')(session);
const client  = redis.createClient();

const logger = require('morgan');
const bodyParser = require('body-parser');

const handlers = require('./handlers');
const {handleGET, handlePOST} = handlers;

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

app.post('/api/notes', (req, resp, next) => {
    handlePOST(req, resp, client);
});

app.get('/api/notes', (req, resp, next) => {
    handleGET(resp, client);
})

app.listen(port, () => {
    console.log(`Listening to ${port}`)
});
