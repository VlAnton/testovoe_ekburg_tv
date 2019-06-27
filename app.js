const express = require('express');
const logger = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');
const redis = require('redis');
const redisStore = require('connect-redis')(session);
const client  = redis.createClient();

const pg = require('pg')
const app = express();
const router = express.Router();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: 'ssshhhhh',
    store: new redisStore({ host: 'localhost', port: 8000, client: client, ttl :  260}),
    saveUninitialized: false,
    resave: false
}));

const db = require('./db')

function updateCache(resp, next) {
    db.query(`SELECT * FROM "Todos" ORDER BY id DESC LIMIT 1`, (error, resToCache) => {
        if (error) {
            return next(error);
        }
        client.get('/api/todos', (err, todos) => {
            if (err) {
                return next(err);
            }
            switch (todos) {
                case null:
                    todo = resToCache.rows.pop();

                    client.set('/api/todos', JSON.stringify([todo]), (error_) => {
                        if (error_) {
                            next(error_);
                        }
                    })
                    resp.send([todo])

                    return;

                default:
                    let newTodos = JSON.parse(todos).concat(resToCache.rows.pop())

                    client.set('/api/todos', JSON.stringify(newTodos), (error_) => {
                        if (error_) {
                            next(error_);
                        }
                    })

                    resp.send(newTodos);
            }                
        })
        
    })
}

app.use('/',router);

router.post('/api/todos', (req, resp, next) => {
    db.query(`INSERT INTO "Todos"(title) VALUES ('${req.body.title}');`, (err, _) => {
        if (err) {
            return next(err);
        }
        return updateCache(resp, next);
    })
});

router.get('/api/todos', (_, resp, __) => {
    client.get('/api/todos', (_, todos) => {
        switch (todos) {
            case null:
                resp.send([]);
                return;

            default:
                resp.send(JSON.parse(todos));
        }
    })
})

app.listen(8080);
