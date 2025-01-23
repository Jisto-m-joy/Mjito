const validateSession = (req, res, next) => {
  if (!req.session.userData || !req.session.userOtp) {
    return res.redirect("/signup");
  }
  next();
};

module.exports = validateSession;
