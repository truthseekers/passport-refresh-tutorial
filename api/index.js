const express = require("express");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const bodyParser = require("body-parser");
const localStrategy = require("passport-local").Strategy;
const passport = require("passport");
const fs = require("fs");
const bcrypt = require("bcrypt");
const users = require("./users.json");
const JWTstrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const jwt = require("jsonwebtoken");
// const fakeLocal = require("./fakeLocal.json");
const secureRoutes = require("./secureRoutes");
const posts = require("./posts");
const cors = require("cors");
require("dotenv").config();
const app = express();

const whitelist = process.env.WHITELISTED_DOMAINS
  ? process.env.WHITELISTED_DOMAINS.split(",")
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(cors(corsOptions));
// app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/user", secureRoutes);
app.use("/posts", posts);

app.use(passport.initialize());

// function getJwt() {
//   // Try accessing a secure route with an INVALID token, and then try with NO TOKEN. You'll get two different errors.
//   // Both of those situations will be blocked by this function, and the app won't even make it to the function in JWTStrategy.
//   return fakeLocal.Authorization?.substring(7); // remove the "Bearer " from the token.
// }

passport.use(
  new JWTstrategy(
    {
      secretOrKey: process.env.ACCESS_TOKEN_SECRET,
      // jwtFromRequest: getJwt,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    },
    async (token, done) => {
      // 0. Don't even make it through the getJwt function check. NO token
      // prints unauthorized.

      // 0B. Invalid token: again doesn't make it into this function. Prints unauthorized

      // 1. Makes it into this function but gets App error (displays error message.) no redirecting.
      // We simulate an "application error" occurring in this function with an email of "tokenerror".
      //
      if (token?.user?.email == "tokenerror") {
        let testError = new Error(
          "something bad happened. we've simulated an application error in the JWTstrategy callback for users with an email of 'tokenerror'."
        );
        return done(testError, false);
      }

      if (token?.user?.email == "emptytoken") {
        // 2. Some other reason for user to not exist. pass false as user:
        // displays "unauthorized". Doesn't allow the app to hit the next function in the chain.
        // We are simulating an empty user / no user coming from the JWT.
        return done(null, false); // unauthorized
      }

      // 3. Successfully decoded and validated user:
      // (adds the req.user, req.login, etc... properties to req. Then calls the next function in the chain.)
      return done(null, token.user);
    }
  )
);

passport.use(
  "signup",
  new localStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        if (password.length <= 4 || !email) {
          done(null, false, {
            message: "Your credentials do not match our criteria..",
          });
        } else {
          const hashedPass = await bcrypt.hash(password, 10);
          let newUser = { email, password: hashedPass, id: uuidv4() };
          users.push(newUser);
          await fs.writeFile("users.json", JSON.stringify(users), (err) => {
            if (err) return done(err); // or throw err?;
          });
          done(null, newUser, { message: "signed up msg" });
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  "login",
  new localStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      // done(null, userObject, { message: "Optional success/fail message"});
      // done(err) // Application Error
      // done(null, false, {message: "Unauthorized login credentials!"}) // User input error when 2nd param is false

      try {
        if (email === "apperror") {
          throw new Error(
            "Oh no! The application crashed! We have reported the issue. You can change next(error) to next(error.message) to hide the stack trace"
          );
        }
        const user = users.find((user) => user.email === email);
        if (!user) {
          return done(null, false, { message: "User not found!" });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
          return done(null, false, { message: "Invalid credentials" });
        }

        return done(null, user, { message: "Hey congrats you are logged in!" });
      } catch (error) {
        return done(error); // application error!
      }
    }
  )
);

app.get("/", (req, res) => {
  //I could be wrong, but I think routes without passing through the JWT strategy will automatically not have the user object, and req.isAuthenticated will be false.
  // So far, whether I login with req.login() or if I don't use req.login, the req.user always appears to be false, and req.isAuthenticated() appears to be false in the "/" route.
  res.send("get index route. /");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/login", (req, res) => {
  res.render("login");
});

// Might not be necessary on a fullStack app because localStorage is where accessToken is stored and we pass it in as Bearer token.
// not sure how to do this on mobile apps yet.
app.get("/logout", async (req, res) => {
  // await fs.writeFile(
  //   "fakeLocal.json",
  //   JSON.stringify({ Authorization: `` }),
  //   (err) => {
  //     if (err) throw err;
  //   }
  // );

  res.redirect("/login");
});

// app.get("/success", (req, res) => {

//   return res.send(`You're in! ${req.query.message}`);
// });

app.get("/failed", (req, res) => {
  res.send("FAILED");
});

app.post("/signup", (req, res, next) => {
  passport.authenticate("signup", async (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.redirect(`failed?message=${info.message}`);
    }

    // req.login(user, { session: false }, async function (err) {
    // if (err) {
    //   return next(err);
    // }

    const body = { _id: user.id, email: user.email };
    const accessToken = jwt.sign(
      { user: body },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "30s",
      }
    );

    // await fs.writeFile(
    //   "fakeLocal.json",
    //   JSON.stringify({ Authorization: `Bearer ${token}` }),
    //   (err) => {
    //     if (err) throw err;
    //   }
    // );

    return res.status(200).json({
      msg: info.message,
      accessToken: accessToken,
    });

    // return res.redirect(`/success?message=${info.message}`);
    // });
  })(req, res, next);
});

app.post(
  "/login",
  function (req, res, next) {
    passport.authenticate("login", async (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.redirect(`/failed?message=${info.message}`);
      }

      // It doesn't seem like the req.login() does anything for us when using JWT.
      // I could be wrong though. You'll have to play around with it yourself.
      // req.login(user, { session: false }, async (error) => {

      const body = { _id: user.id, email: user.email };
      const accessToken = jwt.sign(
        { user: body },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "30s",
        }
      );

      let userIndex = users.findIndex((maybeUser) => {
        return user.email === maybeUser.email;
      });

      console.log("creating refresh token...");
      const refreshToken = await jwt.sign(
        { email: user.email },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: "1m",
        }
      );

      users[userIndex].refreshToken = refreshToken;

      await fs.writeFile("users.json", JSON.stringify(users), (err) => {
        if (err) throw err;
      });

      // don't think I need to write fakeLocal.json anymore. Using localstorage on frontend...
      // await fs.writeFile(
      //   "fakeLocal.json",
      //   JSON.stringify({ Authorization: `Bearer ${token}` }),
      //   (err) => {
      //     if (err) throw err; // we might need to put this in a try catch, but we'll ignore it since it's unrelated to passport and auth.
      //   }
      // );
      return res.status(200).json({
        msg: info.message,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
      // return res.redirect(`success?message=${info.message}`);
      // }); // this is the closing brackets for the req.login
    })(req, res, next);
  },
  (req, res, next) => {
    res.send("Hello"); // able to add functions after the authenticate call now.
  }
);

app.get(
  "/secureroute",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    // 1. Try visiting this route WITHOUT logging in. The authenticate("jwt") line will prevent you from ever getting here.
    //// You should get "unauthorized". In this case use a front end to route appropriately.
    // 2. Try visiting this route with an invalid jwt. So... login, manually alter the jwt, then visit secure route.
    //// you should get "unauthorized" here too. You would use the front end to route in this case.

    // 3. Try visiting this route when logged in with a working user.
    // req.user, req.isAuthenticated, login and logout should all work.

    res.send(`welcome to the top secret place ${req.user.email}`);
  }
);

app.get("/me", async (req, res, next) => {
  const accessToken = req.headers["authorization"].split("Bearer ")[1];

  try {
    const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    const user = {
      email: payload.email,
    };

    return res.send(user);
  } catch (err) {
    res.statusCode = 401;
    return res.send("Unauthorized");
  }
});

app.get("/token", async (req, res) => {
  console.log("token 1");
  const refreshToken = req.headers["authorization"].split("Bearer ")[1];
  console.log("token 2");
  try {
    console.log(
      "token 3.. refreshToken: ",
      refreshToken,
      "secret: ",
      process.env.REFRESH_TOKEN_SECRET
    );
    /////////////////////////// refreshToken isn't passing verification. Need to find out why.
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    console.log("token 4");

    const { email } = payload;
    console.log("token 5");

    const theUser = users.find((user) => user.email == email);
    console.log("token 6");

    const refreshTokensMatch = theUser.refreshToken == refreshToken;
    const body = { _id: theUser.id, email: theUser.email };
    console.log("token 7");

    if (refreshTokensMatch) {
      console.log("token 8");
      const accessToken = await jwt.sign(
        // { email },
        { user: body },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "30s" }
      );
      console.log("token 9");
      return res.json({ accessToken });
    } else {
      console.log("token 10");
      return { msg: "Tokens dont match. yo" };
    }
  } catch (error) {
    console.log("token 11");
    console.log("Error in the /token route");
  }

  console.log("token 12");
  return res.send("attempted to grab the refresh token.");
});

app.listen(3001, () => {
  console.log("listening on port 3001");
});
