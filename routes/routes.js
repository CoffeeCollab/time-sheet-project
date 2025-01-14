import express from "express";
import path from "path";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import timeRouter from "./timeRoutes.js";
import { client } from "../modules/database.js";
import { deleteUserById, addNewUser } from "../modules/data-service.js";
import {
  createUser,
  getUserByEmail,
  getUserByName,
  getUserBySin,
} from "../modules/data-service-auth.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { checkUser } from "../middleware/authMiddleware.js";

const router = express.Router();
const currentDir = process.cwd();
router.use(cookieParser());

router.use(bodyParser.urlencoded({ extended: true }));

// JWT Setup
const jwtKey = "rhf%7<#Y5U1££cKx(3=q{LCF3c";
const maxAge = 12 * 60 * 60;

const createToken = (id) => {
  return jwt.sign({ id }, jwtKey, {
    expiresIn: maxAge,
  });
};

// Route to handle creating a new user
router.post("/create-user", async (req, res) => {
  const { confirmation, ...newUser } = req.body;
  console.log("Received request body:", newUser);

  try {
    const emailExists = await getUserByEmail(client, newUser.email);
    const nameExists = await getUserByName(client, newUser.fullname);
    if (emailExists || nameExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const createdUser = await createUser(client, newUser);
    const createdId = createdUser.insertedId;

    await addNewUser(client, createdId);
    const token = createToken(createdId);

    res
      .cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 })
      .redirect("/shift-tracker");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/shift-tracker", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await getUserByEmail(client, email);

    if (!user) {
      res.status(401).json({ message: "Invalid email" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      const token = createToken(user._id);
      res
        .cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 })
        .sendFile(path.resolve(currentDir, "views", "shiftTracker.ejs"));
    } else {
      res.status(401).json({ message: "Invalid password" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/delete/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    console.log(`Deleting user with ID: ${userId}`);
    // Call the deleteUserById function from data-service.js
    await deleteUserById(client, userId);

    res
      .status(200)
      .json({ message: `User with ID ${userId} deleted successfully` });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/", (req, res) => {
  res.sendFile(path.resolve(currentDir, "views", "index.html"));
});

router.get("/about-us", (req, res) => {
  res.sendFile(path.resolve(currentDir, "views", "aboutUs.html"));
});

router.get("/create-user", (req, res) => {
  res.sendFile(path.resolve(currentDir, "views", "registrationTest.html"));
});

router.get("/logout", (req, res) => {
  res.cookie("jwt", "", { maxAge: 1 }).redirect("/");
});

router.get("/shift-tracker", checkUser, async (req, res) => {
  // res.sendFile(path.resolve(currentDir, "views", "shiftTracker.ejs"));
  const userId = res.locals.user._id;
  const userInfo = await getUserBySin(client, userId);
  console.log(JSON.stringify(userInfo));
  res.render(path.resolve(currentDir, "views", "shiftTracker.ejs"), {
    userName: userInfo.fullname,
    userEmail: userInfo.email,
    userPhone: userInfo.phone,
  });
});

router.use("/record", timeRouter);

export default router;
