const nodemailer = require('nodemailer');

const data = {
    user:"ayushjha7112@gmail.com",
    pass:"nqqbucejnpkhtpnc"
} 

const transporter = nodemailer.createTransport({
    service:"gmail",
    secure:true,
    pool:true,
    auth:data
})

module.exports = transporter