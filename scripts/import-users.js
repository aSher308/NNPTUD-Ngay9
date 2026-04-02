const mongoose = require('mongoose');
const exceljs = require('exceljs');
const crypto = require('crypto');
const path = require('path');
const User = require('../schemas/users');
const Role = require('../schemas/roles');
const mailHandler = require('../utils/mailHandler');

const MONGO_URI = 'mongodb+srv://manhcuucon_db_user:81U9a3fHezNhZhHk@cluster0.htkdoiw.mongodb.net/NNPTUD-Ngay7?appName=Cluster0';
const EXCEL_FILE_PATH = path.join(__dirname, '../uploads/user.xlsx');

function generateRandomPassword(length = 16) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^*()_+~[]{}:;.,-=";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(crypto.randomInt(0, n));
    }
    return password;
}

async function runImport() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // Ensure "user" role exists
        let userRole = await Role.findOne({ name: 'user' });
        if (!userRole) {
            userRole = new Role({ name: 'user', description: 'Standard User Role' });
            await userRole.save();
            console.log("Created 'user' role");
        } else {
            console.log("Found existing 'user' role");
        }

        const workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(EXCEL_FILE_PATH);
        const worksheet = workbook.worksheets[0];

        let importedCount = 0;
        let skippedCount = 0;

        let rowCount = 0;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            rowCount++;
        });
        console.log(`Found ${rowCount} rows in the Excel file.`);

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const username = row.getCell(1).text?.trim(); // Column A
            let emailText = row.getCell(2).text?.trim(); // Column B

            if (!username && !emailText && row.values.length === 0) continue; // skip entirely empty rows

            if (!username || !emailText) {
                console.log(`Skipping row ${i}: missing username or email`);
                skippedCount++;
                continue;
            }

            // Check if user already exists
            const existingUser = await User.findOne({ $or: [{ username }, { email: emailText }] });
            if (existingUser) {
                console.log(`Skipping user ${username} (${emailText}): already exists`);
                skippedCount++;
                continue;
            }

            const plainPassword = generateRandomPassword(16);

            const newUser = new User({
                username: username,
                email: emailText,
                password: plainPassword,
                role: userRole._id
            });

            try {
                await newUser.save();
                console.log(`Created user: ${username}`);

                // Send email
                await mailHandler.sendMail(emailText, username, plainPassword);
                importedCount++;

                // Delay to prevent Mailtrap rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                console.error(`Failed to save or email user ${username}:`, err.message);
                skippedCount++;
            }
        }

        console.log(`\nImport completed.`);
        console.log(`Total created: ${importedCount}`);
        console.log(`Total skipped/failed: ${skippedCount}`);

        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    } catch (error) {
        console.error("Error during import:", error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

runImport();
