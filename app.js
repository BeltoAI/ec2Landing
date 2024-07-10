const express = require('express')
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const app = express()
const port = 443


app.set('view engine', 'html'); // Set View engine to html for the Express app
app.use(express.static('public')); // Use public folder to hold static web resources

// Middleware to parse JSON and urlencoded form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// All get routing accessible from index.html


// Route to serve the index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + 'public/index.html');
})

// Route to serve the waitlist.html
app.get('/company/waitlist', (req, res) => {
    res.sendFile(__dirname + '/public/views/company/waitlist.html');
})

// Route to serve the comingsoon.html
app.get('/company/comingsoon', (req, res) => {
    res.sendFile(__dirname + '/public/views/company/comingsoon.html');
})

// Route to serve the login.html
app.get('/login/login', (req, res) => {
    res.sendFile(__dirname + '/public/views/login/login.html');
})

// Route to serve the reset.html
app.get('/login/reset', (req, res) => {
    res.sendFile(__dirname + '/public/views/login/reset.html');
})

// Route to serve the signup.html
app.get('/login/signup', (req, res) => {
    res.sendFile(__dirname + '/public/views/login/signup.html');
})

// Route to serve the request.html
app.get('/products/request', (req, res) => {
    res.sendFile(__dirname + '/public/views/products/request.html');
})

// Route to serve the contact.html
app.get('/miscellaneous/contact', (req, res) => {
    res.sendFile(__dirname + '/public/views/miscellaneous/contact.html');
})

// Route to serve the terms.html
app.get('/miscellaneous/terms', (req, res) => {
    res.sendFile(__dirname + '/public/views/miscellaneous/terms.html');
})

// Route to serve the doc.html
app.get('/products/doc', (req, res) => {
    res.sendFile(__dirname + '/public/views/products/doc.html');
})

// Route to serve the form.html
app.get('/products/form', (req, res) => {
    res.sendFile(__dirname + '/public/views/products/form.html');
})

// Route to serve the esg.html
app.get('/products/esg', (req, res) => {
    res.sendFile(__dirname + '/public/views/products/esg.html');
})

// Route to serve the aboutus.html
app.get('/company/aboutus', (req, res) => {
    res.sendFile(__dirname + '/public/views/company/aboutus.html');
})

// Route to serve the pricingforeveryone.html
app.get('/pricing/pricingforeveryone', (req, res) => {
    res.sendFile(__dirname + '/public/views/pricing/pricingforeveryone.html');
})

// Route to serve the pricingforenterprises.html
app.get('/pricing/pricingforenterprises', (req, res) => {
    res.sendFile(__dirname + '/public/views/pricing/pricingforenterprises.html');
})






/*
********* POST METHOD HANDLING *********
*/

app.post('/company/waitlist/send', async (req, res) => {
    const { firstName = 'Default First Name', lastName = 'Default Last Name', email, useCase = 'No use case provided', ideas = 'No ideas provided' } = req.body;

    // First try-catch block: Check if email already exists in the database
    try {
        const emailResults = await Database.getEmailIdByEmail(email);

        if (emailResults.length > 0) {
            console.log("Email already exists in the database.");
            return res.status(400).json({ error: 'Email already on waitlist' });
        }
    } catch (error) {
        console.error('Error checking email existence:', error);
        return res.status(500).json({ error: 'Server error while checking email existence.' });
    }

     // Verify and send email
     try {
        const emailVerificationResult = await Mail.sendVerificationEmail(email, 'Waitlist Verified', firstName, lastName);
        if (!emailVerificationResult || !emailVerificationResult.success) {
            return res.status(400).json({ error: emailVerificationResult ? emailVerificationResult.error : 'Unknown error occurred.' });
        } else {
            // Send internal verification email
            // Construct body to send internal operations email
            const body = `Name: ${firstName} ${lastName}\nEmail: ${email}\nUse Case: ${useCase}\nIdea: ${ideas}`;
            await Mail.sendVerificationInternal('Waitlist Verified', body);
            console.log("Mail sent successfully to internal.");
            await Database.addOutreachRecord(firstName, lastName, email, useCase, ideas)
            return res.status(200).json({ message: 'Verification email sent successfully. Please check your inbox and spam folder.' });
        }
    } catch (error) {
        console.error('Unexpected error during email verification:', error);
        return res.status(500).json({ error: 'Server error during email verification.' });
    }
});



app.post('/miscellaneous/contact/send', async (req, res) => {
    const { name = 'Default First Name', email = 'Default Email', phone = 'Default Phone Number', message = 'Default Message' } = req.body;
    console.log(name + '\n' + email + '\n' + phone + '\n' + message)
    
    
     // Verify and send email
     try {
        const emailVerificationResult = await Mail.sendContactVerificationEmail(email, 'Thank You For Contacting Us', name);
        if (!emailVerificationResult || !emailVerificationResult.success) {
            return res.status(400).json({ error: emailVerificationResult ? emailVerificationResult.error : 'Invalid email address.' });
        } else {
            // Send internal verification email
            // Construct body to send internal operations email
            const body = `Name: ${name}\nEmail: ${email}\nUse Case: ${phone}\nIdea: ${message}`;
            await Mail.sendVerificationInternal('New Contact Message', body);
            console.log("Mail sent successfully to internal.");
            await Database.addContactRecord(name, email, phone, message)
            return res.status(200).json({ message: 'Verification email sent successfully. Please check your inbox and spam folder.' });
        }
    } catch (error) {
        console.error('Unexpected error during email verification:', error);
        return res.status(500).json({ error: 'Server error during email verification.' });
    }
    
});



















































// Database class to work with persistance
class Database {

    // Static method to get email ID by email
    static async getEmailIdByEmail(email) {
        try {
            const [emailResult] = await pool.execute(
                'SELECT id FROM outreach WHERE email = ?',
                [email]
            );
            return emailResult;
        } catch (error) {
            throw error;
        }
    }

    static async addOutreachRecord(firstName, lastName, email, useCase, ideas) {
        try {
            // Check if the email already exists
            const emailExists = await Database.getEmailIdByEmail(email);
            if (emailExists.length > 0) {
                console.log('Email already exists:', email);
                return { message: 'Email already exists' };
            }

            // If email does not exist, proceed with adding the record
            const query = 'INSERT INTO outreach (firstName, lastName, email, useCase, ideas) VALUES (?, ?, ?, ?, ?)';
            const [result] = await pool.execute(query, [firstName, lastName, email, useCase, ideas]);
            console.log('Record added successfully');
            return result;
        } catch (error) {
            console.error('Failed to add record:', error.message);
            throw error;
        }
    }

    // Static method to add a contact record
    static async addContactRecord(name, email, number, message) {
        try {
            const query = 'INSERT INTO contact (name, email, number, message, created_at) VALUES (?, ?, ?, ?, NOW())';
            const [result] = await pool.execute(query, [name, email, number, message]);
            console.log('Contact record added successfully');
            return result;
        } catch (error) {
            console.error('Failed to add contact record:', error.message);
            throw error;
        }
    }
}



// Mail class to work with notifications
class Mail {

    static async sendVerificationEmail(to, subject, name, service) {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_SERVER,
            port: process.env.SMTP_PORT,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: to,
            subject: subject,
            html: Mail.generateVerificationEmailBody(name, service), // Call the HTML generator function here
        };

        try {
            const info = await transporter.sendMail(mailOptions);
//            console.log('Email sent: ' + info.response);
            return { success: true, info: info.response };
        } catch (error) {
            if (error.response && error.response.statusCode === 550) {
                console.error('Recipient email may be invalid:', error.message);
                return { success: false, error: 'Invalid email address.' };
            } else {
                console.error('Error sending email: ' + error);
                return { success: false, error: 'Server error while sending email.' };
            }
        }
    }

    static async sendContactVerificationEmail(to, subject, name) {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_SERVER,
            port: process.env.SMTP_PORT,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: to,
            subject: subject,
            html: Mail.generateContactEmailBody(name), // Call the HTML generator function here
        };

        try {
            const info = await transporter.sendMail(mailOptions);
//            console.log('Email sent: ' + info.response);
            return { success: true, info: info.response };
        } catch (error) {
            if (error.response && error.response.statusCode === 550) {
                console.error('Recipient email may be invalid:', error.message);
                return { success: false, error: 'Invalid email address.' };
            } else {
                console.error('Error sending email: ' + error);
                return { success: false, error: 'Server error while sending email.' };
            }
        }
    }


    static async sendVerificationInternal(subject, body) {
        const transporter = nodemailer.createTransport({
                host: process.env.SMTP_SERVER,
                    port: process.env.SMTP_PORT,
                    secure: true, // true for 465, false for other ports
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: process.env.INTERNAL_MAIL_USER,
            subject: subject,
            text: body
        };
   

        try {
            const info = await transporter.sendMail(mailOptions);
      //      console.log('Email sent: ' + info.response);
        } catch (error) {
            console.error('Error sending email: ' + error);
        }
    }





    static generateVerificationEmailBody(name) {
        return `

<html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap');
        
        body {
            font-family: "Roboto", sans-serif;
            background-color: #000;
            color: #ffffff;
            margin: 0;
            padding: 0;
            text-align: center;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            border: 1px solid #b27830;
            border-radius: 15px;
            background-color: #070707;
        }
        .header {
            background-color: #241f0d;
            color: #e5ae02;
            text-align: center;
            padding: 10px;
            font-size: 24px;
            border-radius: 10px 10px 0 0;
            margin-bottom: 20px;
        }
        .header h2 {
            margin: 0;
            color: #e5ae02;
        }
        .content {
            text-align: left;
            padding: 0 20px 20px;
        }
        .content p {
            color: #909dac;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .cta-button {
            display: inline-block;
            background-color: #e5ae02;
            color: #000;
            padding: 10px 20px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
        }
        .logo {
            display: block;
            margin: 0 auto 20px;
        }
        .highlight {
            color: #e5ae02;
            font-weight: bold;
        }
        .highlight-initial {
            color: #e5ae02;
            font-weight: bold;
            font-size: 1.2em;
        }
        .socials {
            display: flex;
            justify-content: center;
            margin-top: 20px;
        }
        .socials a {
            color: #fff;
            margin: 0 10px;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
        <a href="https://belto.site"><img src="https://belto.site/static_resources/landing_page_images_v1/Container.png" alt="Belto Logo" class="logo"></a>
            <h2>Verification Email</h2>
        </div>
        <div class="content">
            <p>Hello <span class="highlight">${name}</span>,</p>
            <p>Thank you for choosing <span class="highlight-initial">B</span>elto for your IT Consultation needs. We're excited to help you enhance your business with our advanced AI solutions.</p>
            <p>Please click the link below to schedule your remote consultation!</p>
            <p>Our team of experts is ready to provide you with personalized assistance, ensuring that you receive the most effective and innovative solutions tailored to your unique needs.</p>
            <p>At <span class="highlight-initial">B</span>elto, we pride ourselves on our core values of integrity, loyalty, and authenticity. We are committed to delivering exceptional service and ensuring your complete satisfaction.</p>
            <p>To learn more about our services and how we can help your business, visit our website or contact our support team.</p>
            <a href="https://calendly.com/beltoworld" class="cta-button">Schedule Consultation</a>
        </div>
        <div class="footer">
            <p>Follow us on our social media channels for the latest updates and news:</p>
            <div class="socials">
                <a href="https://www.facebook.com/belto.world" target="_blank">Facebook</a>
                <a href="https://www.twitter.com/belto.world" target="_blank">Twitter</a>
                <a href="https://www.linkedin.com/company/belto.world" target="_blank">LinkedIn</a>
                <a href="https://www.instagram.com/belto.world" target="_blank">Instagram</a>
                <a href="https://www.tiktok.com/@belto.news?lang=en" target="_blank">TikTok</a>
            </div>
            <p>&copy; 2024 <span class="highlight-initial">B</span>elto Inc. All Rights Reserved.</p>
        </div>
    </div>
</body>
</html>






        `;
    }



    static generateContactEmailBody(name) {
        return `
    <html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap');
        
        body {
            font-family: "Roboto", sans-serif;
            background-color: #000;
            color: #ffffff;
            margin: 0;
            padding: 0;
            text-align: center;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            border: 1px solid #b27830;
            border-radius: 15px;
            background-color: #070707;
        }
        .header {
            background-color: #241f0d;
            color: #e5ae02;
            text-align: center;
            padding: 10px;
            font-size: 24px;
            border-radius: 10px 10px 0 0;
            margin-bottom: 20px;
        }
        .header h2 {
            margin: 0;
            color: #e5ae02;
        }
        .content {
            text-align: left;
            padding: 0 20px 20px;
        }
        .content p {
            color: #909dac;
            line-height: 1.6;
            margin-bottom: 15px;
        }
        .cta-button {
            display: inline-block;
            background-color: #e5ae02;
            color: #000;
            padding: 10px 20px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
        }
        .logo {
            display: block;
            margin: 0 auto 20px;
        }
        .highlight {
            color: #e5ae02;
            font-weight: bold;
        }
        .highlight-initial {
            color: #e5ae02;
            font-weight: bold;
            font-size: 1.2em;
        }
        .socials {
            display: flex;
            justify-content: center;
            margin-top: 20px;
        }
        .socials a {
            color: #fff;
            margin: 0 10px;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
        <a href="https://belto.site"><img src="https://belto.site/static_resources/landing_page_images_v1/Container.png" alt="Belto Logo" class="logo"></a>
            <h2>Verification Email</h2>
        </div>
        <div class="content">
            <p>Hello <span class="highlight">${name}</span>,</p>
            <p>Thank you for reaching out to us through our contact form. We have received your message and our team will get back to you shortly.</p>
            <p>Your queries and feedback are important to us, and we are here to assist you with any information or support you may need.</p>
            <p>If you have any urgent concerns, feel free to contact our support team directly via our website or through our social media channels.</p>
            <p>At <span class="highlight-initial">B</span>elto, we are committed to delivering exceptional service and ensuring your complete satisfaction.</p>
        </div>
        <div class="footer">
            <p>Follow us on our social media channels for the latest updates and news:</p>
            <div class="socials">
                <a href="https://www.facebook.com/belto.world" target="_blank">Facebook</a>
                <a href="https://www.twitter.com/belto.world" target="_blank">Twitter</a>
                <a href="https://www.linkedin.com/company/belto.world" target="_blank">LinkedIn</a>
                <a href="https://www.instagram.com/belto.world" target="_blank">Instagram</a>
                <a href="https://www.tiktok.com/@belto.news?lang=en" target="_blank">TikTok</a>
            </div>
            <p>&copy; 2024 <span class="highlight-initial">B</span>elto Inc. All Rights Reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
    }
    
    


    



}




const verifyEmailSend = async (email, firstName, lastName) => {
    try {
        await Mail.sendVerificationEmail(email, 'Waitlist Verified', `${firstName} ${lastName}`);
        console.log("Mail sent successfully to client for verification.");
        return { success: true };
    } catch (error) {
        if (error.response && error.response.statusCode === 550) {
            console.error('Recipient email may be invalid:', error.message);
            return { success: false, error: 'Invalid email address.' };
        } else {
            console.error('Error sending email to client:', error);
            return { success: false, error: 'Server error while sending email.' };
        }
    }
};


























app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
