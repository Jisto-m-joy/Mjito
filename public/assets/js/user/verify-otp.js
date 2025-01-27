document.getElementById("otp").focus();

let timer = 60; // Set initial timer value
let timerInterval;
let timerExpired = false; // Add a flag to track if the timer has expired

// Function to start or restart the timer
function startTimer() {
  clearInterval(timerInterval); // Clear any existing interval
  timer = 60; // Reset the timer to 60 seconds
  timerExpired = false; // Reset the timerExpired flag
  document.getElementById("timerValue").textContent = timer; // Reset the displayed value
  document.getElementById("timerValue").classList.remove("expired"); // Remove expired class if exists
  document.getElementById("otp").disabled = false; // Enable OTP input

  timerInterval = setInterval(() => {
    timer--;
    document.getElementById("timerValue").textContent = timer;
    if (timer <= 0) {
      clearInterval(timerInterval);
      timerExpired = true; // Set the timerExpired flag to true
      document.getElementById("timerValue").classList.add("expired");
      document.getElementById("timerValue").textContent = "Expired";
      document.getElementById("otp").disabled = true;
    }
  }, 1000);
}

startTimer(); // Start the timer on page load

function validateOTPForm() {
  const otpInput = document.getElementById("otp").value;

  $.ajax({
    type: "POST",
    url: "verify-otp",
    data: { otp: otpInput },
    success: function (response) {
      if (response.success) {
        Swal.fire({
          icon: "success",
          title: "OTP Verified Successfully",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          window.location.href = response.redirectUrl;
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: response.message,
        });
      }
    },
    error: function () {
      Swal.fire({
        icon: "error",
        title: "Invalid OTP",
        text: "Please try again",
      });
    }
  });
  return false;
}

function resendOTP() {
  if (!timerExpired) {
    Swal.fire({
      icon: "warning",
      title: "Warning",
      text: "Resend OTP only works after the timer expires",
    });
    return false;
  }

  clearInterval(timerInterval);
  timer = 60;
  timerExpired = false; // Reset the timerExpired flag

  document.getElementById("otp").disabled = false;
  document.getElementById("timerValue").classList.remove("expired");
  startTimer();

  $.ajax({
    type: "POST",
    url: "resend-otp",
    success: function (response) {
      if (response.success) {
        Swal.fire({
          icon: "success",
          title: "OTP Resent Successfully",
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "An error occurred while resending OTP. Please try again.",
        });
      }
    },
    error: function () {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "An error occurred while resending OTP. Please try again.",
      });
    },
  });
  return false;
}