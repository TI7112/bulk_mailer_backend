const mysqli = require('mysql2');

const connection = mysqli.createPool({
    // host:process.env.hostname,
    // user:process.env.user,
    // password:process.env.password,
    // database:process.env.database,
    host:"localhost",
    user:"root",
    password:"",
    database:"email_app",
    // user:"webappde_emailApp",
    // password:"Admin@7112",
    // database:"webappde_emailApp",
    connectionLimit:5
})

module.exports = connection;