const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");
const app = express();
const PORT = 5000;
const mongoURL = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(mongoURL);
app.use(express.urlencoded({ extended: true }));
// Escape user input before displaying it in HTML
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char];
    });
}
// Display registration form
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});
// Process submitted form and store details in MongoDB
app.post("/server", async (req, res) => {

    try {
        const { name, password, age, mobile, email, gender, state } = req.body;
        const skills = Array.isArray(req.body.skills)
            ? req.body.skills
            : req.body.skills
                ? [req.body.skills]
                : [];
        // Server-side validation
        if (
            !name || !password || !age || !mobile ||
            !email || !gender || !state || skills.length === 0
        ) {
            return res.status(400).send("All fields are mandatory.");
        }
        if (!/^[A-Za-z ]+$/.test(name)) {
            return res.status(400).send("Invalid name.");
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}/.test(password)) {
            return res.status(400).send("Invalid password format.");
        }
        if (!Number.isInteger(Number(age)) ||
            Number(age) < 18 || Number(age) > 100) {
            return res.status(400).send("Invalid age.");
        }
        if (!/^[0-9]{10}$/.test(mobile)) {
            return res.status(400).send("Mobile number must contain 10 digits.");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).send("Invalid email.");
        }
        if (!["Male", "Female"].includes(gender)) {
            return res.status(400).send("Invalid gender.");
        }
        const allowedStates = [
            "Tamil Nadu", "Kerala", "Karnataka",
            "Andhra Pradesh", "Telangana", "Maharashtra", "Other"
        ];
        if (!allowedStates.includes(state)) {

            return res.status(400).send("Invalid state.");
        }
        const allowedSkills = ["JavaScript", "Python", "C++", "Java"];
        if (skills.some(skill => !allowedSkills.includes(skill))) {
            return res.status(400).send("Invalid skill selection.");
        }
        const db = client.db("WebTechExp10");
        const collection = db.collection("registrations");
        const registration = {
            name,
            password,
            age: Number(age),
            mobile,
            email,
            gender,
            state,
            skills,
            createdAt: new Date()
        };
        await collection.insertOne(registration);
        // Retrieve the saved registration from MongoDB
        const savedUsers = await collection
            .find({})
            .sort({ createdAt: -1, _id: -1 })
            .toArray();
        let rows = "";
        savedUsers.forEach(user => {
            rows += `
                <tr>
                    <td>${escapeHTML(user.name)}</td>
                    <td>${escapeHTML(user.password)}</td>
                    <td>${escapeHTML(user.age)}</td>
                    <td>${escapeHTML(user.mobile)}</td>
                    <td>${escapeHTML(user.email)}</td>
                    <td>${escapeHTML(user.gender)}</td>
                    <td>${escapeHTML(user.state)}</td>
                    <td>${escapeHTML(user.skills.join(", "))}</td>
                </tr>
            `;
        });

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                      content="width=device-width, initial-scale=1.0">
                <title>User Submitted Details</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background: #f1f5f9;
                        margin: 0;
                        padding: 25px;
                        color: #1e293b;
                    }
                    .student-info {
                        position: absolute;
                        top: 15px;
                        right: 20px;
                        text-align: right;
                        font-size: 12px;
                        line-height: 1.6;
                    }
                    h1 {
                        text-align: center;
                        color: #1d4ed8;
                        margin-top: 55px;
                    }
                    .table-container {
                        width: 100%;
                        overflow-x: auto;
                        background: white;
                        border-radius: 8px;
                        padding: 10px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        background: white;
                    }

                    th, td {
                        border: 1px solid #cbd5e1;
                        padding: 12px;
                        text-align: left;
                        overflow-wrap: anywhere;
                    }
                    th {
                        background: #dbeafe;
                        color: #1e3a8a;
                    }
                    a {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 11px 18px;
                        background: #2563eb;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                    }
                </style>
            </head>
            <body>
                <div class="student-info">
                    <strong>Madhan Kumar</strong><br>
                    URK24CS9035
                </div>
                <h1>User Submitted Details</h1>
                <p style="text-align:center;">
                    Registration saved successfully in MongoDB.
                </p>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Password</th>
                                <th>Age</th>
                                <th>Mobile Number</th>
                                <th>Email</th>
                                <th>Gender</th>
                                <th>State</th>
                                <th>Skills</th>

                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <a href="/">Register Another User</a>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).send(
            "An error occurred while saving the registration. " +
            "Check that MongoDB is running and try again."
        );
    }
});
// Start server after connecting to MongoDB
async function startServer() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("MongoDB Connected Successfully");
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Could not connect to MongoDB:", error.message);
        process.exit(1);
    }
}
startServer();
