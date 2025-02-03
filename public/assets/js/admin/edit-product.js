let currentCropper = null;

function replaceImage(event, imageName, index) {
  const input = event.target;
  const file = input.files[0];
  const reader = new FileReader();
  input.name = `replace_${imageName}`;

  reader.onload = function (e) {
    const imgElement = document.getElementById(`cropperImg${index}`);
    imgElement.src = e.target.result;

    const cropperContainer = document.getElementById(
      `cropperContainer${index}`
    );
    cropperContainer.style.display = "flex";

    if (currentCropper) {
      currentCropper.destroy();
    }

    currentCropper = new Cropper(imgElement, {
      aspectRatio: 1,
      viewMode: 2,
      guides: true,
      background: false,
      autoCropArea: 1,
      zoomable: true,
    });

    const saveButton = document.getElementById(`saveButton${index}`);
    saveButton.addEventListener(
      "click",
      async function () {
        const croppedCanvas = currentCropper.getCroppedCanvas();
        const productImg = document.getElementById(`productImg${index}`);
        productImg.src = croppedCanvas.toDataURL("image/webp", 1.0);
        const timestamp = new Date().getTime();
        const fileName = `cropped-img-${timestamp}-${index}.webp`;

        await croppedCanvas.toBlob((blob) => {
          const imgFile = new File([blob], fileName, { type: "image/webp" });
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(imgFile);
          input.files = dataTransfer.files;
        });

        cropperContainer.style.display = "none";
        currentCropper.destroy();
        currentCropper = null;
      },
      { once: true }
    );
  };

  reader.readAsDataURL(file);
}



function validateAndSubmit(event) {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  // Collect combo data
  const combos = [];
  const comboRows = document.querySelectorAll(".combo-row");

  comboRows.forEach((row, index) => {
    const size = row
      .querySelector(`input[name="combos[${index}].size"]`)
      .value.trim();
    const quantity = row
      .querySelector(`input[name="combos[${index}].quantity"]`)
      .value.trim();
    const regularPrice = row
      .querySelector(`input[name="combos[${index}].regularPrice"]`)
      .value.trim();
    const salesPrice = row
      .querySelector(`input[name="combos[${index}].salesPrice"]`)
      .value.trim();
    const color = row
      .querySelector(`input[name="combos[${index}].color"]`)
      .value.trim();

    combos.push({
      size,
      quantity: parseInt(quantity),
      regularPrice: parseFloat(regularPrice),
      salesPrice: parseFloat(salesPrice),
      color,
    });
  });

  // Create FormData
  const form = event.target;
  const formData = new FormData(form);
  formData.set("combos", JSON.stringify(combos));

  // Show loading state
  Swal.fire({
    title: "Updating product...",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  // Send request
  fetch(form.action, {
    method: "POST",
    body: formData,
  })
    .then(async (response) => {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Server error occurred");
        }

        return data;
      } else {
        throw new Error("Response is not JSON");
      }
    })
    .then((data) => {
      if (data.success) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: data.message,
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          window.location.href = "/admin/products";
        });
      } else {
        throw new Error(data.error || "Unknown error occurred");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "An error occurred while updating the product.",
        showConfirmButton: true,
      });
    });
}

// validateForm function
function validateForm() {
  clearErrorMessages();
  let isValid = true;

  const comboSet = new Set();

  // Validate Product Name
  const name = document.getElementsByName("productName")[0].value.trim();
  if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
    // Allow letters, numbers, and spaces
    displayErrorMessage(
      "productName-error",
      "Product name should contain only alphabetic characters and numbers."
    );
    isValid = false;
  }

  // Validate Product Description
  const description = document.getElementById("descriptionid").value.trim();
  if (!/.+/.test(description)) {
    // Allows any character (at least one)
    displayErrorMessage(
      "description-error",
      "Product description cannot be empty."
    );
    isValid = false;
  }

  // Validate Brand
  const brand = document.getElementsByName("brand")[0].value;
  if (!brand) {
    displayErrorMessage("brand-error", "Brand must be selected.");
    isValid = false;
  }

  // Validate Combos
  const combos = document.querySelectorAll(".combo-row");
  combos.forEach((combo, index) => {
    const size = combo
      .querySelector(`input[name="combos[${index}].size"]`)
      .value.trim();
    const quantity = combo
      .querySelector(`input[name="combos[${index}].quantity"]`)
      .value.trim();
    const regularPrice = combo
      .querySelector(`input[name="combos[${index}].regularPrice"]`)
      .value.trim();
    const salesPrice = combo
      .querySelector(`input[name="combos[${index}].salesPrice"]`)
      .value.trim();
    const color = combo
      .querySelector(`input[name="combos[${index}].color"]`)
      .value.trim();

    // Check if any field is empty
    if (size === "") {
      displayErrorMessage("size-error", "This is Empty");
      isValid = false;
    }

    if (quantity === "") {
      displayErrorMessage("quantity-error", "This is Empty");
      isValid = false;
    }

    if (regularPrice === "") {
      displayErrorMessage("regularPrice-error", "This is Empty");
      isValid = false;
    }

    if (salesPrice === "") {
      displayErrorMessage("salesPrice-error", "This is Empty");
      isValid = false;
    }

    if (color === "") {
      displayErrorMessage("color-error", "This is Empty");
      isValid = false;
    }

    if (
      !/^\d+(\.\d{1,2})?$/.test(regularPrice) ||
      parseFloat(regularPrice) < 0
    ) {
      displayErrorMessage(
        "regularPrice-error",
        "Please enter a valid non-negative price."
      );
      isValid = false;
    }

    if (
      !/^\d+(\.\d{1,2})?$/.test(salesPrice) ||
      parseFloat(salesPrice) < 0 ||
      parseFloat(salesPrice) >= parseFloat(regularPrice)
    ) {
      displayErrorMessage(
        "salesPrice-error",
        "Please enter a valid non-negative sale price lower than the original price."
      );
      isValid = false;
    }

    // Check for duplicate combos
    const comboKey = `${size}-${regularPrice}-${salesPrice}-${color}`;
    if (comboSet.has(comboKey)) {
      displayErrorMessage("combo-error", "Duplicate combo detected.");
      isValid = false;
    } else {
      comboSet.add(comboKey); // Add comboKey to the set if unique
    }
  });

  return isValid; // Return the overall validation result
}

function displayErrorMessage(elementId, message) {
  const errorElement = document.getElementById(elementId);
  errorElement.innerText = message;
  errorElement.style.display = "block";
}

function clearErrorMessages() {
  const errorElements = document.getElementsByClassName("error-message");
  Array.from(errorElements).forEach((element) => {
    element.innerText = "";
  });
}

const addComboBtn = document.getElementById("addComboBtn");
const productCombosContainer = document.getElementById("product-combos");

// Add Event Listener for "Add Another Combo" Button
// Add Event Listener for "Add Another Combo" Button
addComboBtn.addEventListener("click", () => {
  // Create a new combo row
  const newRow = document.createElement("div");
  newRow.classList.add("row", "combo-row");

  // Get the current number of combo rows to set the correct index
  const comboRowCount = document.querySelectorAll(".combo-row").length;

  newRow.innerHTML = `
        <div class="col-lg-3">
            <label class="form-label">Size</label>
            <input name="combos[${comboRowCount}].size" type="text" class="form-control border">
            <div id="size-error" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Quantity</label>
            <input name="combos[${comboRowCount}].quantity" type="text" class="form-control border">
            <div id="quantity-error" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Regular Price</label>
            <input name="combos[${comboRowCount}].regularPrice" type="number" class="form-control border">
            <div id="regularPrice-error" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Sale Price</label>
            <input name="combos[${comboRowCount}].salesPrice" type="number" class="form-control border">
            <div id="salesPrice-error" class="error-message"></div>
        </div>
        <div class="col-lg-3">
            <label class="form-label">Color</label>
            <input name="combos[${comboRowCount}].color" type="text" class="form-control border">
            <div id="color-error" class="error-message"></div>
        </div>
        <div class="col-lg-3 d-flex align-items-center">
            <button type="button" class="btn btn-danger delete-combo-btn">Delete</button>
        </div>
    `;

  // Append the new row to the product-combos container
  productCombosContainer.appendChild(newRow);

  // Attach delete functionality to the "Delete" button of the new row
  newRow
    .querySelector(".delete-combo-btn")
    .addEventListener("click", handleDeleteRow);
});

// Function to Handle Row Deletion
function handleDeleteRow() {
  const comboRows = document.querySelectorAll(".combo-row");

  // Prevent deletion if it's the only remaining row
  if (comboRows.length > 1) {
    this.closest(".combo-row").remove(); // Remove the current row
  } else {
    alert("At least one combo is required."); // Alert the user
  }
}

document.querySelectorAll(".delete-combo-btn").forEach((btn) => {
  btn.addEventListener("click", handleDeleteRow);
});

// Add event listeners for existing delete buttons (if any)
document.querySelectorAll(".delete-combo-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    btn.closest(".combo-row").remove(); // Remove the row
  });
});
