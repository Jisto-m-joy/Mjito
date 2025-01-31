function validateAndSubmit(event) {
  event.preventDefault();

  if (validateForm()) {
    // Create array of combos from form data
    let combos = [];
    const comboRows = document.querySelectorAll(".combo-row");
    
    comboRows.forEach((row) => {
      const combo = {
        color: row.querySelector('input[name="color"]').value,
        size: row.querySelector('input[name="size"]').value,
        quantity: parseInt(row.querySelector('input[name="quantity"]').value),
        salesPrice: parseFloat(row.querySelector('input[name="salesPrice"]').value),
        regularPrice: parseFloat(row.querySelector('input[name="regularPrice"]').value)
      };
      combos.push(combo);
    });

    // Create FormData object
    const form = document.getElementById('addProductForm');
    const formData = new FormData(form);

    // Remove any existing combos field to avoid duplication
    formData.delete('combos');
    
    // Add the combos array as a JSON string
    formData.append('combos', JSON.stringify(combos));

    // Log form data for debugging
    for (let pair of formData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }

    // Send the request
    fetch("/admin/addProducts", {
      method: "POST",
      body: formData
    })
    .then(async (response) => {
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        // Try to parse error message if it's JSON
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      return response.json();
    })
    .then((data) => {
      Swal.fire({
        icon: "success",
        title: "Success",
        text: data.message || "Product added successfully",
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        window.location.href = "/admin/products";
      });
    })
    .catch((error) => {
      console.error("Fetch Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "An error occurred while adding the product.",
        timer: 2000,
        showConfirmButton: false
      });
    });
  }
}



function viewImage1(event) {
  document.getElementById("imgView1").src = URL.createObjectURL(
    event.target.files[0]
  );
}

function viewImage2(event) {
  document.getElementById("imgView2").src = URL.createObjectURL(
    event.target.files[0]
  );
}

function viewImage3(event) {
  document.getElementById("imgView3").src = URL.createObjectURL(
    event.target.files[0]
  );
}

function viewImage4(event) {
  document.getElementById("imgView4").src = URL.createObjectURL(
    event.target.files[0]
  );
}

function viewImage(event, index) {
  let input = event.target;
  let reader = new FileReader();
  reader.onload = function () {
    let dataURL = reader.result;
    let image = document.getElementById("imgView" + index);
    image.src = dataURL;

    let cropper = new Cropper(image, {
      aspectRatio: 1,
      viewModel: 1,
      guides: true,
      background: false,
      autoCropArea: 1,
      zoomable: true,
    });

    let cropperContainer = document.querySelector(
      "#croppedImg" + index
    ).parentNode;
    cropperContainer.style.display = "block";

    let saveButton = document.querySelector("#saveButton" + index);
    saveButton.addEventListener("click", async function () {
      let croppedCanvas = cropper.getCroppedCanvas();
      let croppedImage = document.getElementById("croppedImg" + index);
      croppedImage.src = croppedCanvas.toDataURL("image/jpeg", 1.0);

      let timestamp = new Date().getTime();
      let fileName = `cropped-img-${timestamp}-${index}.webp`;

      await croppedCanvas.toBlob((blob) => {
        let input = document.getElementById("input" + index);
        let imgFile = new File([blob], fileName, blob);
        const fileList = new DataTransfer();
        fileList.items.add(imgFile);
        input.files = fileList.files;
      });

      croppedContainer.style.display = "none";
      cropper.destroy();
    });
  };

  reader.readAsDataURL(input.files[0]);
}

const selectedImages = [];
document.getElementById("input1").addEventListener("change", handleFileSelect);

function handleFileSelect(event) {
  const addedImagesContainer = document.getElementById("addedImagesContainer");
  addedImagesContainer.innerHTML = "";
  const files = event.target.files;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    selectedImages.push(file);
    const thumbnail = document.createElement("div");
    thumbnail.classList.add("thumbnail");

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = "thumbnail";
    img.style.width = "50px";
    img.style.height = "auto";
    const removeIcon = document.createElement("span");
    removeIcon.classList.add("remove-icon");
    removeIcon.innerHTML = "&times";
    removeIcon.addEventListener("click", function () {
      const index = selectedImages.indexOf(file);
      if (index !== -1) {
        selectedImages.splice(index, 1);
      }
      thumbnail.remove();
    });
    thumbnail.appendChild(img);
    thumbnail.appendChild(removeIcon);
    addedImagesContainer.appendChild(thumbnail);
  }
}


// Update validateForm to handle numeric validation
function validateForm() {
  clearErrorMessages();
  let isValid = true;
  
  // Basic field validation
  const name = document.getElementsByName("name")[0].value;
  const description = document.getElementById("descriptionid").value;
  const brand = document.getElementsByName("brand")[0].value;
  const category = document.getElementsByName("category")[0].value;
  const images = document.getElementById("input1");

  if (!name?.trim()) {
    displayErrorMessage("productName-error", "Please enter a product name.");
    isValid = false;
  }

  if (!description?.trim()) {
    displayErrorMessage("description-error", "Please enter the product description.");
    isValid = false;
  }

  if (!images?.files?.length) {
    displayErrorMessage("images-error", "Please select at least one image.");
    isValid = false;
  }

  // Validate all combos
  const combos = document.querySelectorAll(".combo-row");
  const comboSet = new Set();

  combos.forEach((combo, index) => {
    const salesPrice = parseFloat(combo.querySelector('input[name="salesPrice"]').value);
    const regularPrice = parseFloat(combo.querySelector('input[name="regularPrice"]').value);
    const quantity = parseInt(combo.querySelector('input[name="quantity"]').value);
    const size = combo.querySelector('input[name="size"]').value.trim();
    const color = combo.querySelector('input[name="color"]').value.trim();

    // Check for empty fields
    if (!size) {
      displayErrorMessage(`size-error`, "Size is required.");
      isValid = false;
    }

    if (!color) {
      displayErrorMessage(`color-error`, "Color is required.");
      isValid = false;
    }

    // Validate numeric fields
    if (isNaN(quantity) || quantity <= 0) {
      displayErrorMessage(`quantity-error`, "Quantity must be a positive number.");
      isValid = false;
    }

    if (isNaN(salesPrice) || salesPrice <= 0) {
      displayErrorMessage(`salePrice-error`, "Sale price must be a positive number.");
      isValid = false;
    }

    if (isNaN(regularPrice) || regularPrice <= 0) {
      displayErrorMessage(`regularPrice-error`, "Regular price must be a positive number.");
      isValid = false;
    }

    // Validate price relationship
    if (regularPrice <= salesPrice) {
      displayErrorMessage(`regularPrice-error`, "Regular price must be greater than sale price.");
      isValid = false;
    }

    // Check for duplicate combinations
    const comboKey = `${size}-${color}`;
    if (comboSet.has(comboKey)) {
      displayErrorMessage(`combo-error`, "Duplicate size and color combination found.");
      isValid = false;
    } else {
      comboSet.add(comboKey);
    }
  });

  return isValid;
}


function displayErrorMessage(elementId, message) {
  var errorElement = document.getElementById(elementId);
  errorElement.innerText = message;
  errorElement.style.display = "block";
}

function clearErrorMessages() {
  const errorElements = document.getElementsByClassName("error-message");
  Array.from(errorElements).forEach((element) => {
    element.innerText = "";
  });
}

//New combo displaying code

document.getElementById("addComboBtn").addEventListener("click", addNewCombo);

function addNewCombo() {
  const comboContainer = document.getElementById("product-combos");

  // Create a new combo row
  const newRow = document.createElement("div");
  newRow.classList.add("row", "combo-row", "mb-3");

  newRow.innerHTML = `
    <div class="row">
      <div class="col-lg-4">
        <div class="mb-4">
          <label class="form-label">Regular price</label>
          <input placeholder="$" name="regularPrice" type="text" class="form-control border" />
          <div class="error-message"></div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="mb-4">
          <label class="form-label">Sale price</label>
          <input placeholder="$" name="salesPrice" type="text" class="form-control border" />
          <div class="error-message"></div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="mb-4">
          <label class="form-label">Quantity</label>
          <input placeholder="" name="quantity" type="text" class="form-control border" />
          <div class="error-message"></div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-4">
        <div class="mb-4">
          <label class="form-label">Color</label>
          <input name="color" type="text" class="form-control border" />
          <div class="error-message"></div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-lg-4">
        <div class="mb-4">
          <label class="form-label">Size</label>
          <input name="size" type="text" class="form-control border" />
          <div class="error-message"></div>
        </div>
      </div>
    </div>
    <div class="col-lg-3 d-flex align-items-center">
      <button type="button" class="btn btn-danger delete-combo-btn">Delete</button>
    </div>
  `;

  // Append the new combo row to the combo container
  comboContainer.appendChild(newRow);

  // Add event listener for the delete button
  newRow
    .querySelector(".delete-combo-btn")
    .addEventListener("click", handleDeleteRow);
}


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

// Add event listeners for existing delete buttons (if any)
document.querySelectorAll(".delete-combo-btn").forEach((btn) => {
  btn.addEventListener("click", handleDeleteRow);
});