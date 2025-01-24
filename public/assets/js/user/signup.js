function signupValidation() {
  const name = document.getElementById("signup_name").value.trim();
  const email = document.getElementById("signup_email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document
    .getElementById("signup_confirm_password")
    .value.trim();

  let isValid = true;

  // Name validation
  if (!name) {
    displayError("error1", "Name is required.");
    isValid = false;
  } else if (name.length < 3) {
    displayError("error1", "Name must be at least 3 characters long.");
    isValid = false;
  } else {
    clearError("error1");
  }
  // Email validation
  if (!email) {
    displayError("error2", "Email is required.");
    isValid = false;
  } else if (!/^[a-zA-Z0-9.!#$%&'+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/.test(email)) {
    displayError("error2", "Invalid email format.");
    isValid = false;
  } else {
    clearError("error2");
  }
  

  // Password validation
  if (!password) {
    displayError("error3", "Password is required.");
    isValid = false;
  } else if (password.length < 6) {
    displayError("error3", "Password must be at least 6 characters long.");
    isValid = false;
  } else {
    clearError("error3");
  }

  // Confirm password validation
  if (!confirmPassword) {
    displayError("error4", "Confirm password is required.");
    isValid = false;
  } else if (password !== confirmPassword) {
    displayError("error4", "Passwords do not match.");
    isValid = false;
  } else {
    clearError("error4");
  }

  return isValid;
}

function displayError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

function clearError(elementId) {
  const errorElement = document.getElementById(elementId);
  errorElement.textContent = "";
  errorElement.style.display = "none";
}
