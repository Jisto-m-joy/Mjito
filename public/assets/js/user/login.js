function loginValidation() {
  const email = document.getElementById("login_email").value.trim();
  const password = document.getElementById("login_password").value.trim();
  let isValid = true;

  // Email validation
  if (!email) {
    displayError("error1", "Email is required.");
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    displayError("error1", "Invalid email format.");
    isValid = false;
  } else {
    clearError("error1");
  }

  // Password validation
  if (!password) {
    displayError("error2", "Password is required.");
    isValid = false;
  } else if (password.length < 6) {
    displayError("error2", "Password must be at least 6 characters long.");
    isValid = false;
  } else {
    clearError("error2");
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
