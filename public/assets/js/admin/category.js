function handleFormSubmit(event) {
  event.preventDefault();
  if (!validateForm()) {
    return;
  }

  const name = document.getElementsByName("name")[0].value;
  const description = document.getElementById("descriptionId").value;

  fetch("/admin/addCategory", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ name, description }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error);
        });
      }
      return response.json();
    })
    .then((data) => {
      location.reload();
    })
    .catch((error) => {
      if (error.message === "Category already exists") {
        Swal.fire({
          icon: "error",
          title: "Oops",
          text: "Category already exists",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops",
          text: "An error occurred while adding the category",
        });
      }
    });
}

function validateForm() {
  clearErrorMessages();
  const name = document.getElementsByName("name")[0].value.trim();
  const description = document.getElementById("descriptionId").value.trim();
  let isValid = true;

  if (name === "") {
    displayErrorMessage("name-error", "Please enter a name");
    isValid = false;
  } else if (!/^[a-zA-Z\s]+$/.test(name)) {
    displayErrorMessage(
      "name-error",
      "Category name should contain only alphabetic characters"
    );
    isValid = false;
  }
  if (description === "") {
    displayErrorMessage("description-error", "Please enter a description");
    isValid = false;
  }
  return isValid;
}

function displayErrorMessage(elementId, message) {
  var errorElement = document.getElementById(elementId);
  errorElement.innerHTML = message;
  errorElement.style.display = "block";
}

function clearErrorMessages() {
  const errorElements = document.getElementsByClassName("error-message");
  Array.from(errorElements).forEach((element) => {
    element.innerText = "";
    element.style.display;
  });
}

async function addOffer(categoryId) {
  const { value: amount } = await Swal.fire({
    title: "Offer in percentage",
    input: "number",
    inputLabel: "Percentage",
    inputPlaceholder: "%",
  });

  if (amount) {
    try {
      const response = await fetch("/admin/addCategoryOffer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          percentage: amount,
          categoryId: categoryId,
        }),
      });

      const data = await response.json();
      if (response.ok && data.status === true) {
        Swal.fire("Offer added", "The offer has been added", "success").then(
          () => {
            location.reload();
          }
        );
      } else {
        Swal.fir("Failed", data.message || "Adding offer failed", "error");
      }
    } catch (error) {
      Swal.fire("Error", "An error occurred while adding the offer", "error");
      console.log("Error adding offer", error);
    }
  }
}

async function removeOffer(categoryId) {
  try {
    const response = await fetch("/admin/removeCategoryOffer", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        categoryId: categoryId,
      }),
    });

    const data = await response.json();

    if (response.ok && data.status === true) {
      Swal.fire("Offer removed", "The offer has been removed", "success").then(
        () => {
          location.reload();
        }
      );
    } else {
      Swal.fire("Failed", data.message || "Removing offer failed", "error");
    }
  } catch (error) {
    Swal.fire("Error", "An error occurred while removing the offer", "error");
    console.error("Error removing offer", error);
  }
}
