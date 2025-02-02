"use strict";

const User = require("../models/user");
const passport = require("passport");
const jsonWebToken = require("jsonwebtoken");

const getUserParams = (body) => {
  return {
    name: {
      first: body.first,
      last: body.last,
    },
    email: body.email,
    password: body.password,
    zipCode: body.zipCode,
  };
};

// const token = process.env.TOKEN || "recipeT0k3n";

module.exports = {
  index: (req, res, next) => {
    User.find()
      .then((users) => {
        res.locals.users = users;
        next();
      })
      .catch((error) => {
        console.log(`Error fetching users: ${error.message}`);
        next(error);
      });
  },
  indexView: (req, res) => {
    res.render("users/index");
  },
  new: (req, res) => {
    res.render("users/new");
  },
  create: (req, res, next) => {
    if (req.skip) next();
    let newUser = new User(getUserParams(req.body));
    User.register(newUser, req.body.password, (error, user) => {
      if (user) {
        req.flash(
          "success",
          `${user.fullName}'s account created successfully!`
        );
        res.locals.redirect = "/users";
        next();
      } else {
        req.flash(
          "error",
          `Failed to create user account because: ${error.message}.`
        );
        res.locals.redirect = "/users/new";
        next();
      }
    });
  },
  redirectView: (req, res, next) => {
    let redirectPath = res.locals.redirect;
    if (redirectPath) res.redirect(redirectPath);
    else next();
  },
  show: (req, res, next) => {
    let userId = req.params.id;
    User.findById(userId)
      .then((user) => {
        res.locals.user = user;
        next();
      })
      .catch((error) => {
        console.log(`Error fetching user by ID: ${error.message}`);
        next(error);
      });
  },
  showView: (req, res) => {
    res.render("users/show");
  },
  edit: (req, res, next) => {
    let userId = req.params.id;
    User.findById(userId)
      .then((user) => {
        res.render("users/edit", {
          user: user,
        });
      })
      .catch((error) => {
        console.log(`Error fetching user by ID: ${error.message}`);
        next(error);
      });
  },
  update: (req, res, next) => {
    let userId = req.params.id,
      userParams = {
        name: {
          first: req.body.first,
          last: req.body.last,
        },
        email: req.body.email,
        password: req.body.password,
        zipCode: req.body.zipCode,
      };
    User.findByIdAndUpdate(userId, {
      $set: userParams,
    })
      .then((user) => {
        res.locals.redirect = `/users/${userId}`;
        res.locals.user = user;
        next();
      })
      .catch((error) => {
        console.log(`Error updating user by ID: ${error.message}`);
        next(error);
      });
  },
  delete: (req, res, next) => {
    let userId = req.params.id;
    User.findByIdAndRemove(userId)
      .then(() => {
        res.locals.redirect = "/users";
        next();
      })
      .catch((error) => {
        console.log(`Error deleting user by ID: ${error.message}`);
        next();
      });
  },
  login: (req, res) => {
    res.render("users/login");
  },
  authenticate: passport.authenticate("local", {
    failureRedirect: "/users/login",
    failureFlash: "Failed to login.",
    successRedirect: "/",
    successFlash: "Logged in!",
  }),
  validate: (req, res, next) => {
    req
      .sanitizeBody("email")
      .normalizeEmail({
        all_lowercase: true,
      })
      .trim();
    req.check("email", "Email is invalid").isEmail();
    req
      .check("zipCode", "Zip code is invalid")
      .notEmpty()
      .isInt()
      .isLength({
        min: 5,
        max: 5,
      })
      .equals(req.body.zipCode);
    req.check("password", "Password cannot be empty").notEmpty();

    req.getValidationResult().then((error) => {
      if (!error.isEmpty()) {
        let messages = error.array().map((e) => e.msg);
        req.skip = true;
        req.flash("error", messages.join(" and "));
        res.locals.redirect = "/users/new";
        next();
      } else {
        next();
      }
    });
  },
  logout: (req, res, next) => {
    req.logout();
    req.flash("success", "You have been logged out!");
    res.locals.redirect = "/";
    next();
  },

  //METHOD 1 :
  // verifyToken: (req, res, next) => {
  //   if (req.query.apiToken === token) next();
  //   else next(new Error("Invalid API token"));
  // },

  //METHOD 2 :
  // verifyToken: (req, res, next) => {
  //   let token = req.query.apiToken;
  //   if (token) {
  //     User.findOne({ apiToken: token})
  //     .then( user => {
  //       if (user) next();
  //       else next(new Error("Invalid API token for user"));
  //     })
  //     .catch(error => { //no user match exists for given query api token
  //       next(new Error(error.message));
  //     });
  //   } else { //Error occurs in query || No query param was used
  //     next(new Error("API token unrecognized/invalid"));
  //   }
  // },

  //METHOD 3 :
  apiAuthenticate: (req, res, next) => {
    //Verify user email address and password match that of a User in database
    passport.authenticate("local", (errors, user) => {
      if (user) {
        //Create token with users ID & expiration date
        let signedToken = jsonWebToken.sign(
          {
            data: user._id,
            exp: new Date().setDate(new Date().getDate() + 1), //Expires 1 day from the time of signing (24hrs)
          },
          "secret_encoding_passphrase"
        );
        res.json({
          success: true,
          token: signedToken,
        });
      } else {
        res.json({
          success: false,
          message: "Could not authenticate user...",
        });
      }
      res, res, next;
    });
  },

  verifyJWT: (req, res, next) => {
    let token = req.headers.token;
    if (token) {
      jsonWebToken.verify( //Decoding the token -> Verify authenticity
        token,
        "secret_encoding_passphrase",
        (errors, payload) => {
          if (payload) { //Does decoded payload  have a value
            User.findById(payload.data).then((user) => {
              if (user) {
                next();
              } else { //No user with given payload exists
                res.status(httpStatus.FORBIDDEN).json({
                  error: true,
                  message: "Error: Payload - No Such User account found.",
                });
              }
            });
          } else { //No user id exists in db that matches the given payload data
            res.status(httpStatus.UNAUTHORIZED).json({
              error: true,
              message: "Error: Payload - Cannot verify API token.",
            });
            next();
          }
        }
      );
    } else { //No Token
      res.status(httpStatus.UNAUTHORIZED).json({
        error: true,
        message: "Provide Token",
      });
    }
  },
};
