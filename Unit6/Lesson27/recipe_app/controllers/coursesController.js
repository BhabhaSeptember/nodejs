"use strict";

const Course = require("../models/course");
const httpStatus = require("http-status-codes");
const User = require("../models/user");

module.exports = {
  index: (req, res, next) => {
    Course.find({})
      .then(courses => {
        res.locals.courses = courses;
        next();
      })
      .catch(error => {
        console.log(`Error fetching courses: ${error.message}`);
        next(error);
      });
  },
  indexView: (req, res) => {
    // if (req.query.format === "json") {
    //   res.json(res.locals.courses);
    // } else {
    // res.render("courses/index");
    // }

    res.render("courses/index");
  },
  new: (req, res) => {
    res.render("courses/new");
  },

  create: (req, res, next) => {
    let courseParams = {
      title: req.body.title,
      description: req.body.description,
      items: [req.body.items.split(",")],
      zipCode: req.body.zipCode
    };
    Course.create(courseParams)
      .then(course => {
        res.locals.redirect = "/courses";
        res.locals.course = course;
        next();
      })
      .catch(error => {
        console.log(`Error saving course: ${error.message}`);
        next(error);
      });
  },

  show: (req, res, next) => {
    let courseId = req.params.id;
    Course.findById(courseId)
      .then(course => {
        res.locals.course = course;
        next();
      })
      .catch(error => {
        console.log(`Error fetching course by ID: ${error.message}`);
        next(error);
      });
  },

  showView: (req, res) => {
    res.render("courses/show");
  },

  edit: (req, res, next) => {
    let courseId = req.params.id;
    Course.findById(courseId)
      .then(course => {
        res.render("courses/edit", {
          course: course
        });
      })
      .catch(error => {
        console.log(`Error fetching course by ID: ${error.message}`);
        next(error);
      });
  },

  update: (req, res, next) => {
    let courseId = req.params.id,
      courseParams = {
        title: req.body.title,
        description: req.body.description,
        items: [req.body.items.split(",")],
        zipCode: req.body.zipCode
      };

    Course.findByIdAndUpdate(courseId, {
      $set: courseParams
    })
      .then(course => {
        res.locals.redirect = `/courses/${courseId}`;
        res.locals.course = course;
        next();
      })
      .catch(error => {
        console.log(`Error updating course by ID: ${error.message}`);
        next(error);
      });
  },

  delete: (req, res, next) => {
    let courseId = req.params.id;
    Course.findByIdAndRemove(courseId)
      .then(() => {
        res.locals.redirect = "/courses";
        next();
      })
      .catch(error => {
        console.log(`Error deleting course by ID: ${error.message}`);
        next();
      });
  },

  redirectView: (req, res, next) => {
    let redirectPath = res.locals.redirect;
    if (redirectPath !== undefined) res.redirect(redirectPath);
    else next();
  },

  respondJSON: (req, res) => {
    res.json({
      status: httpStatus.OK, //Code 200
//Take locals object from index res.locals.courses variable and display it in JSON format instead of rendering data in EJS
      data: res.locals
    });
  },

//If an error occurs, respond with status code 500 instead of redirecting to another browser view/page  
  errorJSON: (error, req, res, next) => {
    let errorObject;

    if (error) {
      errorObject = {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: error.message
      };
    } else {
      errorObject = {
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: "Unknown Error"
    };
  }
  res.json(errorObject);
  },

  join: (req, res, next) => {
    let courseId = req.params.id;
    let currentUser = req.user;
    
    if (currentUser) { //check if user currently logged in
      User.findByIdAndUpdate(currentUser, {
        $addToSet: {
          courses: courseId
        }
      })
      .then( () => {
        res.locals.success = true;
        next();
      })
      .catch( error => {
        next(error);
      });
    } else {
      next(new Error("User must login first"));
    }
  },

  filterUserCourses: (req, res, next) => {
    let currentUser = res.locals.currentUser;

    //Check if user is logged in
    if (currentUser) {
      let mappedCourses = res.locals.courses.map( (course) => {
        //userJoined value is True or False
        let userJoined = currentUser.courses.some( (userCourse) => {
          return userCourse.equals(course._id);
        });
        return Object.assign(course.toObject(), {joined: userJoined});
      });
      res.locals.courses = mappedCourses;
      next();
    } else {
      next();
    }
  }
};
