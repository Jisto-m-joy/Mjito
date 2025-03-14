const User = require("../models/userSchema");

const userAuth = (req, res, next) => {
  if (req.session.user) {
    User.findById(req.session.user)
      .then((data) => {
        if (data && !data.isBlocked) {
          // Set the user data in req.user
          req.user = data;
          next();
        } else {
          console.error("User is not authenticated");
          res.redirect("/login");
        }
      })
      .catch((error) => {
        console.log("Error in user auth middleware", error);
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.redirect("/login");
  }
};

const adminAuth = (req, res, next) => {
  if (req.session.admin) {
    User.findOne({ isAdmin: true })
      .then((data) => {
        if (data) {
          next();
        } else {
          res.redirect("/admin/login");
        }
      })
      .catch((error) => {
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.redirect("/admin/login");
  }
};



const checkBlockStatus = async (req, res, next) => {
  if (req.session && req.session.user) {
    try {
      const user = await User.findById(req.session.user._id);
      if (user && user.isBlocked) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
          }
          res.redirect("/login");
        });
      } else {
        next();
      }
    } catch (error) {
      console.error("Error checking block status:", error);
      res.status(500).send("Server error");
    }
  } else {
    next();
  }
};

module.exports = {
  userAuth,
  adminAuth,
  checkBlockStatus,
};
