const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525, // Recommended Mailtrap port
    secure: false, // Use true for port 465, false for port 587
    auth: {
        user: "3085e98e0ffb86",
        pass: "e6f69dc5e7429a",
    },
});
module.exports = {
    sendMail: async function (to, username, password) {
        const info = await transporter.sendMail({
            from: '"NNPTUD System" <no-reply@nnptud.com>',
            to: to,
            subject: "Your Account Password",
            text: `Hello ${username},\n\nYour account has been created. Your password is: ${password}\n\nPlease keep it safe.`,
            html: `<p>Hello <b>${username}</b>,</p><p>Your account has been created.</p><p>Your password is: <b>${password}</b></p><p>Please keep it safe.</p>`,
        });

        console.log("Message sent to %s: %s", to, info.messageId);
    }
}
