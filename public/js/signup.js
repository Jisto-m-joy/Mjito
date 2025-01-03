function signupValidation() {
    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (!firstName) {
        alert('First name is required!');
        return false;
    }

    if (!lastName) {
        alert('Last name is required!');
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
