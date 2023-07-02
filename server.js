const express = require('express');
const app = express()
const nodemailer = require('nodemailer')
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const connection = require('./config/db')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

app.use(express.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
}))
app.use(session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 60 * 60 * 24
    }
}))


// routes

app.get('/', (req,res)=>{
    res.send('Hello World')
})

app.post('/login', (req, res) => {
    const email = req.body.email
    const password = req.body.password
    const sqlQuery = `SELECT * FROM tbl_user WHERE email = '${email}'`
    connection.query(sqlQuery, (err, results) => {
        if (results === undefined) {
            return res.send('Server Error Please try after few minutes')
        }
        else {
            if (results.length === 0) {
                res.send("No user Found");
            }
            else {
                const hash = results[0].password
                bcrypt.compare(password, hash, function (err, result) {
                    if (result) {
                        const user = req.body
                        delete user['password']
                        req.session.user = user
                        const token = jwt.sign({ id: results.id }, 'jsonwebtoken', { expiresIn: 3000000 });
                        return res.send({ isLogin: true, token, user: req.session.user });
                    }
                    else {
                        return res.send("Please enter correct password")
                    }
                });
            }
        }
    })
})


app.post('/signup', function (req, res) {
    const password = req.body.password
    const hash = bcrypt.hashSync(password, 10);
    const data = [req.body.name, req.body.email, hash]
    const sqlQuery = "INSERT INTO `tbl_user`(`name`, `email`, `password`) VALUE (?)"
    connection.query(sqlQuery, [data], (err, results) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.send(`An account already exist with ${req.body.email} email. Please do Login`)
            }
            return res.send(err);
        }
        else {
            const user = req.body
            delete user['password']
            req.session.user = user
            const token = jwt.sign({ id: results.id }, 'jsonwebtoken', { expiresIn: 3000000 });
            return res.send({ isLogin: true, token, user: req.session.user });
        }
    })
})

app.post('/authorisation', (req, res) => {
    const [token, email] = req.body;
    jwt.verify(token, 'jsonwebtoken', async function (err, decoded) {
        if (decoded === undefined) {
            return res.send({ Authorisation: false })
        }
        else {
            const sqlQuery = `SELECT * FROM tbl_user WHERE email = '${email}'`
            const [[results], feild] = await connection.promise().execute(sqlQuery)
            delete results['password']
            return res.send({ Authorisation: true, sessionUser: results })
        }
    });
})


app.post('/sendmail', async (req, res) => {

    const { userEmail, email, subject, message } = req.body;
    const sqlQuery = `SELECT * FROM tbl_smtp WHERE smtp_email = "${userEmail}"`
    const [results, feild] = await connection.promise().execute(sqlQuery)
    if (results.length > 0) {

        const data = {
            user: results[0].smtp_email,
            pass: results[0].smtp_password
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            secure: true,
            pool: true,
            auth: data
        })

        // try 2

        const recipients = email.split(',')
        try {
            // Send email to each recipient
            console.log(recipients);
            for (const recipient of recipients) {
                const mailOptions = {
                    from: 'ayushjha7112@gmail.com',
                    to: recipient,
                    subject: subject,
                    text: message
                };

                await transporter.sendMail(mailOptions, (err) => {
                    if (err) {
                        res.send(err)
                    }
                    else {
                        const data = [mailOptions.from, mailOptions.to, mailOptions.subject, mailOptions.text]
                        // const sqlQuery = `INSERT INTO tbl_mails(user_email , recipent_email , subject , msg) VALUES ('${data[0]}' ,'${data[1]}' ,'${data[2]}' ,'${data[3]}')`
                        // const [err, result] = connection.promise().execute(sqlQuery)

                        // return res.send("Email send sucessfully")


                        connection.query("INSERT INTO `tbl_mails`( `user_email`, `recipent_email`, `subject`, `msg`) VALUES (?)", [data] , (err, results) => {
                            if (err) {
                               return res.send(err) 
                            }
                        })
                    }
                });
            }
            res.send("Email send sucessfully")
        }
        catch (error) {
            console.error('Error sending emails:', error);
            return res.send(error);
        }
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy()
    return res.send('You have been Logout sucessfully')
})


app.listen(5000)
