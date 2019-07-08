const {Pool, Client} = require('pg')

const pool = new Pool()
const client = new Client({
    user: '',
    host: 'localhost',
    database: '',
    password: null,
    port: 5432,
})
client.connect()

module.exports = {
  query: (text, params, callback) => {
    return client.query(text, params, callback)
  }
}