import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password',
  },
});

// Only one export for the function
export const sendNotification = (to, message) => {
  const mailOptions = {
    from: 'your-email@gmail.com',
    to: to,
    subject: 'New Folder Activity',
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } 
    else {
      console.log('Email sent: ' + info.response);
    }
  });
};
