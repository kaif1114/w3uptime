import express from "express";
// import { database } from "./startup/database.js";
import { routes } from "./startup/routes";
import dotenv from "dotenv";
import "express-async-errors";
import { prisma } from "db/client";

dotenv.config();

const app = express();

// app.use(cors({
//   origin: process.env.FRONTEND_URL,
//   credentials: true,
//   exposedHeaders: ["Authorization"]
// }));
// app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(errorHandler);

// database();
routes(app);


app.get("/", (req, res) => {
  res.send("Hello World");
});

//route to test prisma for fetching from database
app.get("/users", async (req, res) => {
  console.log("Getting users for testing");
 try {
  const users = await prisma.user.findMany();
  console.log("Users", users);
  res.json(users);
 } catch (error) {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
 }
});



app.get("/ping", (req, res) => {
  res.status(200).send("Success");
});

const port = process.env.PORT || 4000;


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
