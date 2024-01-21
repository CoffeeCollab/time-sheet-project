import express from "express";
import path from "path";
import router from "./routes/root.js";
import mongoose from "mongoose";
import 'dotenv/config'

const app = express();
const PORT = process.env.PORT || 3000;

//console.log(process.env.NODE_ENV)

mongoose.connect(process.env.MONGODB_URI);


// Check if the connection is successful
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
    console.log("Connected to MongoDB");
});

app.use(express.json())

// Use process.cwd() to get the current working directory
const currentDir = process.cwd();

app.use(express.static(path.join(currentDir, 'public')))

app.use('/', router);

//Handle errors
app.all('*', (req, res) => {
    res.status(404)
    if (req.accepts('html')) {
        res.sendFile(path.join(currentDir, 'views', '404.html'))
    } else if (req.accepts('json')) {
        res.json({message: '404 Not Found'})
    } else {
        res.type('txt').send('404 Not Found')
    }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));