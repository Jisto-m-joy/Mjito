function validateAdminLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  let isValid = true;

  // Email validation
  if (!email) {
    displayError("emailError", "Email is required.");
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    displayError("emailError", "Enter a valid email address.");
    isValid = false;
  } else {
    clearError("emailError");
  }

  // Password validation
  if (!password) {
    displayError("passwordError", "Password is required.");
    isValid = false;
  } else if (password.length < 6) {
    displayError("passwordError", "Password must be at least 6 characters.");
    isValid = false;
  } else {
    clearError("passwordError");
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
