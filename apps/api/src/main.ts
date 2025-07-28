import express from "express";
// import { database } from "./startup/database.js";
// import { routes } from "./startup/routes.js";
import dotenv from "dotenv";
import "express-async-errors";

dotenv.config();

const app = express();

// app.use(cors({
//   origin: process.env.FRONTEND_URL,
//   credentials: true,
//   exposedHeaders: ["Authorization"]
// }));
// app.use(cookieParser());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(errorHandler);

// database();
// routes(app);


app.get("/", (req, res) => {
  res.send("Hello World");
});



app.get("/ping", (req, res) => {
  res.status(200).send("Success");
});

const port = process.env.PORT || 4000;


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
