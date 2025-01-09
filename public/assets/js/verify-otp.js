document.getElementById("otp").focus();

let timer = 60; // Set initial timer value
let timerInterval;

// Function to start or restart the timer
function startTimer() {
  clearInterval(timerInterval); // Clear any existing interval
  timer = 60; // Reset the timer to 60 seconds
  document.getElementById("timerValue").textContent = timer; // Reset the displayed value
  document.getElementById("timerValue").classList.remove("expired"); // Remove expired class if exists
  document.getElementById("otp").disabled = false; // Enable OTP input

  timerInterval = setInterval(() => {
    timer--;
    document.getElementById("timerValue").textContent = timer;
    if (timer <= 0) {
      clearInterval(timerInterval);
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

// function resendOTP() {
//   $.ajax({
//     type: "POST",
//     url: "/resend-otp",
//     success: function (response) {
//       if (response.success) {
//         Swal.fire({
//           icon: "success",
//           title: "OTP Resent Successfully",
//           showConfirmButton: false,
//           timer: 1500,
//         });

//         // Restart the timer when OTP is resent
//         startTimer();
//       } else {
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: response.message,
//         });
//       }
//     },
//     error: function () {
//       Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: "An error occurred while resending OTP. Please try again.",
//       });
//     },
//   });
//   return false;
// }


function resendOTP(){
  clearInterval(timerInterval);
  time=60;
  
  document.getElementById("otp").disabled = false;
  document.getElementById("timervalue").classList.remove("expired");
  startTimer();

  $.aja
}
