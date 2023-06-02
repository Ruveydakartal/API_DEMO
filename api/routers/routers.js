import { Router } from "express";
import passport from "passport";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { initClient } from "../db/mongo.js";
import { createUserData, hash } from "../middleware/auth/hash.js";

//Initialize MongoDB client and database:
const client = await initClient();
const db = client.db("immo");

const registerRegularRoutes = (app) => {
  app.post("/login", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    // check if users exists in the database
    let user = await db.collection("users").findOne({
      email,
    });

    // if not, show error message
    if (!user) {
      return res.status(400).json({
        error: "user bestaat niet",
      });
    }
    let hashedPassword = hash(user, password);
    // if yes, check if the password is correct
    if (hashedPassword !== user.password) {
      return res.status(400).json({
        error: "Wachtwoord is niet correct",
      });
    }

    // // if yes, generate a token
    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN_HOURS * 60,
      }
    );

    delete user.password;
    delete user.salt;
    delete user.saltParam;

    // send back the user object
    res.json({
      ...user,
      token,
    });
  });

  app.post("/register", async (req, res) => {
    const { name, firstname, email, password, role } = req.body;
    try {
      // Check if the username already exists
      const existingUser = await db.collection("users").findOne({
        email,
      });
      if (existingUser) {
        return res.status(400).json({
          error: "User already exists",
        });
      }

      // Create a new user
      const newUser = createUserData({
        name,
        firstname,
        email,
        password,
        role
      });

      // Insert the user into the database
      await db.collection("users").insertOne(newUser);

      // Generate a new token for the registered user
      const token = jwt.sign(
        {
          id: newUser._id,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN_HOURS * 60 * 60,
        }
      );

      delete newUser.password;
      delete newUser.salt;
      delete newUser.saltParam;
      res.json({
        token,
        ...newUser,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        error: "Internal Server Error",
      });
    }
  });

  app.get("/home", async (req, res) => {
    const properties = await db.collection("properties").find().toArray();
    res.json(properties);
  });
  app.get("/home", async (req, res) => {
    const users = await db.collection("users").find().toArray();
    res.json(users);
  });
  app.get("/offices", async (req, res) => {
    const offices = await db.collection("offices").find().toArray();
    res.json(offices);
  });

  // get properties for sale
  app.get("/for-sale", async (req, res) => {
    const properties = await db
      .collection("properties")
      .find({
        state: "Te koop",
      })
      .toArray();
    res.json(properties);
  });

  // get properties for rent
  app.get("/for-rent", async (req, res) => {
    const properties = await db
      .collection("properties")
      .find({
        state: "Te huur",
      })
      .toArray();
    res.json(properties);
  });

  // get a property
  app.get("/detail/:id", async (req, res) => {
    const id = req.params.id;
    const property = await db.collection("properties").findOne({
      _id: ObjectId(id),
    });

    res.json(property);
  });

  // get a user
  app.get("/profile/:id", async (req, res) => {
    const id = req.params.id;
    const user = await db.collection("users").findOne({
      _id: ObjectId(id),
    });

    res.json(user);
  });

  // update a user
  app.patch("/profile/:id", async (req, res) => {
    const id = req.params.id;
    const user = await db.collection("users").findOne({
      _id: ObjectId(id),
    });

    if (user) {
      const { _id, ...data } = req.body;
      const newData = {
        ...user,
        ...data,
      };
      await db.collection("users").replaceOne(
        {
          _id: ObjectId(id),
        },
        newData
      );

      res.json(newData);
    } else {
      res.status(404).json({
        error: "Not found",
      });
    }
  });
  app.delete("/profile/:id", async (req, res) => {
    const id = req.params.id;
    const user = await db.collection("users").findOne({
      _id: ObjectId(id),
    });

    if (user) {
      await db.collection("users").deleteOne({
        _id: ObjectId(id),
      });
      res.json(user);
    } else {
      res.status(404).json({
        error: "Not found",
      });
    }
  });

  // post a favorite
  app.post("/detail/:id/favorite", async (req, res) => {
    const id = req.params.id;
    const favorite = {
      ...req.body,
    };

    try {
      await db.collection("favorites").insertOne(favorite);
      res.sendStatus(200); // or send a success response
    } catch (error) {
      console.log(error);
      res.sendStatus(500); // or send an error response
    }
  });

  app.post("/detail/:id/message", async (req, res) => {
    const id = req.params.id;
    const message = {
      ...req.body,
    };
    try {
      await db.collection("messages").insertOne(message);
      res.sendStatus(200); // or send a success response
    } catch (error) {
      console.log(error);
      res.sendStatus(500); // or send an error response
    }
  });

  app.get("/favorites", async (req, res) => {
    const favorites = await db.collection("favorites").find().toArray();
    res.json(favorites);
  });
};

const registerAdminRoutes = (app) => {
  const adminRouter = Router();

  adminRouter.use(
    passport.authenticate("jwt", {
      session: false,
      failWithError: true,
    })
  );

  adminRouter.patch("profile/:id", async (req, res) => {
    console.log("test");
    const id = req.params.id;
    const user = await db.collection("users").findOne({
      _id: ObjectId(id),
    });

    if (user) {
      const { _id, ...data } = req.body;
      console.log(req.body);
      const newData = {
        ...student,
        ...data,
      };
      await db.collection("users").replaceOne(
        {
          _id: ObjectId(id),
        },
        newData
      );
      console.log(newData);
      res.json(newData);
    } else {
      res.status(404).json({
        error: "Not found",
      });
    }
  });

  adminRouter.get("users/:id", async (req, res) => {
    const id = req.params.id;
    const user = await db.collection("users").findOne({
      _id: ObjectId(id),
    });

    if (user) {
      res.json(student);
    } else {
      res.status(404).json({
        error: "Not found",
      });
    }
  });

  adminRouter.delete("/profile/:id", async (req, res) => {
    const id = req.params.id;

    await db.collection("users").deleteOne({
      _id: ObjectId(id),
    });

    res.json({});
  });

  app.use(adminRouter);
};

const registerRoutes = async (app) => {
  registerRegularRoutes(app);

  registerAdminRoutes(app);

  //// Custom error handler middleware to handle JWT authentication errors
  app.use((err, req, res, next) => {
    if (err.name === "AuthenticationError") {
      res.status(401).json({
        error: "Token expired",
      });
    } else {
      console.log(err);
      res.status(500).json({
        error: "Internal Server Error",
      });
    }
  });
};

export { registerRoutes };
