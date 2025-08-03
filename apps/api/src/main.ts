/// <reference path="./types/global.d.ts" />
import express from "express";
import { connectDatabase } from "./startup/database";
import { routes } from "./startup/routes";
import dotenv from "dotenv";
import { prisma } from "db/client";
import { errorHandler } from "./middleware/error";

dotenv.config();

async function startServer() {
  const app = express();

  // app.use(cors({
  //   origin: process.env.FRONTEND_URL,
  //   credentials: true,
  //   exposedHeaders: ["Authorization"]
  // }));
  // app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));


  await connectDatabase();
  routes(app);


  app.get("/", (req, res) => {
    res.send("Hello World");
  });


  //route to test prisma for fetching from database
  app.get("/test-database", async (req, res) => {
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


  app.use(errorHandler);

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
