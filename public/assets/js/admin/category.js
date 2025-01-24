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
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Category added successfully",
      }).then(() => {
        location.reload();
      });
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
    element.style.display = "none";
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
    const response = await fetch(`/admin/removeCategoryOffer/${categoryId}`, {
      // Include categoryId in URL
      method: "DELETE", // Change method to DELETE
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


async function confirmList(categoryId) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "You want to list this category!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, list it!'
  });

  if (result.isConfirmed) {
    fetch(`/admin/unlistCategory?id=${categoryId}`, {
      method: 'GET' 
    }).then(() => {
      Swal.fire(
        'Listed!',
        'The category has been listed.',
        'success'
      ).then(() => {
        location.reload();
      });
    }).catch((error) => {
      Swal.fire('Error', 'An error occurred while listing the category', 'error');
      console.error('Error listing category', error);
    });
  }
}

async function confirmUnlist(categoryId) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "You want to unlist this category!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, unlist it!'
  });

  if (result.isConfirmed) {
    fetch(`/admin/listCategory?id=${categoryId}`, {
      method: 'GET' 
    }).then(() => {
      Swal.fire(
        'Unlisted!',
        'The category has been unlisted.',
        'success'
      ).then(() => {
        location.reload();
      });
    }).catch((error) => {
      Swal.fire('Error', 'An error occurred while unlisting the category', 'error');
      console.error('Error unlisting category', error);
    });
  }
}