function signupValidation() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    // const error1 = document.getElementById('error1');
    // const error2 = document.getElementById('error2');
    // const error3 = document.getElementById('error3');
    // const error4 = document.getElementById('error4');
    // const signform = document.getElementById('signform');

   
    if (!name) {
        alert('Name is required!');
        return false;
    }

    if (!email) {
        alert('Email is required!');
        return false;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Enter a valid email address!');
        return false;
    }

    if (!password) {
        alert('Password is required!');
        return false;
    }

    // Password strength validation (minimum 6 characters)
    if (password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return false;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return false;
    }

    // If all validations pass
    return true;
}
