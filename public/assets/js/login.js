

// Function to validate the login form
function loginValidation() {
    // Get form elements
    const email = document.getElementById('login_email').value.trim();
    const password = document.getElementById('login_password').value.trim();

    // Get error message elements
    const error1 = document.getElementById('error1');
    const error2 = document.getElementById('error2');

    // Clear previous error messages
    error1.textContent = "";
    error2.textContent = "";

    // Validate email
    if (email === "") {
        error1.textContent = "Email is required.";
        return false;
    } else if (!validateEmail(email)) {
        error1.textContent = "Invalid email format.";
        return false;
    }

    // Validate password
    if (password === "") {
        error2.textContent = "Password is required.";
        return false;
    }

    // If all validations pass
    return true;
}

// Attach the validation function to the form submit event
document.getElementById('loginform').onsubmit = function() {
    return loginValidation();
};