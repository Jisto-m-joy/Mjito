document.addEventListener("DOMContentLoaded", function () {
    const adminLoginForm = document.getElementById("adminLoginForm");
    const emailField = document.getElementById("adminEmail");
    const passwordField = document.getElementById("adminPassword");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
  
    adminLoginForm.addEventListener("submit", function (event) {
      let isValid = true;
      const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
      if (!emailPattern.test(emailField.value)) {
        emailError.textContent = "Invalid email format";
        isValid = false;
      } else {
        emailError.textContent = "";
      }
      if (passwordField.value.length < 8) {
        passwordError.textContent = "Password should contain at least 8 characters";
        isValid = false;
      } else {
        passwordError.textContent = "";
      }
  
      if (!isValid) {
        event.preventDefault();
      }
    });
  });