function validateAndSubmit(event) {
  event.preventDefault();
  if (validateForm()) {
    submitForm(event);

    // Collect combo data from the form
    let combos = [];
    const comboRows = document.querySelectorAll(".combo-row");

    comboRows.forEach((row) => {
      const salesPrice = row.querySelector('input[name="salesPrice"]').value;
      const size = row.querySelector('input[name="size"]').value;
      const quantity = row.querySelector('input[name="quantity"]').value;
      const regularPrice = row.querySelector('input[name="regularPrice"]').value;
      const color = row.querySelector('input[name="color"]').value;

      combos.push({
        size: size.split(','),
        salesPrice: parseFloat(salesPrice),
        quantity: parseInt(quantity, 10),
        regularPrice: parseFloat(regularPrice),
        color: color,
      });
    });

    const combosField = document.createElement("input");
    combosField.type = "hidden";
    combosField.name = "combos";
    combosField.value = JSON.stringify(combos); // Convert the combos array to a json string
    document.forms[0].appendChild(combosField);

    document.forms[0].submit();
  } else {
    iziToast.error({
      title: "Error",
      message: "Please correct the errors in the form.",
      position: "topRight",
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

function validateForm() {
  clearErrorMessages();
  const name = document.getElementsByName("name")[0].value;
  const description = document.getElementById("descriptionid").value;
  const brand = document.getElementsByName("brand")[0].value;
  const category = document.getElementsByName("category")[0].value;
  const images = document.getElementById("input1");
  let isValid = true;

  const comboSet = new Set();

  if (name.trim() === "") {
    displayErrorMessage("productName-error", "Please enter a product name.");
    isValid = false;
  } else if (!/^[a-zA-Z0-9\s\-\_]+$/.test(name.trim())) {
    displayErrorMessage(
      "productName-error",
      "Product name should contain only alphabetic characters."
    );
    isValid = false;
  }

  if (description.trim() === "") {
    displayErrorMessage(
      "description-error",
      "Please enter the product description."
    );
    isValid = false;
  } 

    // Validate Combos
    const combos = document.querySelectorAll(".combo-row");
    combos.forEach((combo, index) => {
      const salesPrice = combo.querySelector('input[name="salesPrice"]').value.trim();
      const size = combo.querySelector('input[name="size"]').value.trim();
      const quantity = combo.querySelector('input[name="quantity"]').value.trim();
      const regularPrice = combo
        .querySelector('input[name="regularPrice"]')
        .value.trim();
      const color = combo.querySelector('input[name="color"]').value.trim();
  
      // Check if any field is empty
      if (size === "") {
        displayErrorMessage(`comboRAM-error-${index}`, "This is Empty");
        isValid = false;
      }
  
      if (quantity === "") {
        displayErrorMessage(`comboQuantity-error-${index}`, "This is Empty");
        isValid = false;
      }
  
      if (regularPrice === "") {
        displayErrorMessage(`comboReg-error-${index}`, "This is Empty");
        isValid = false;
      }
  
      if (salesPrice === "") {
        displayErrorMessage(`comboSale-error-${index}`, "This is Empty");
        isValid = false;
      }
  
      if (color === "") {
        displayErrorMessage(`comboColor-error-${index}`, "This is Empty");
        isValid = false;
      }
  
      // checking if regular price is greater than sale price
      if (parseFloat(regularPrice) <= parseFloat(salesPrice)) {
        displayErrorMessage(
          `comboReg-error-${index}`,
          "Regular price must be greater than sale price."
        );
        isValid = false;
      }
  
      // Checing for duplicate combos
      const comboKey = `${size}-${quantity}-${regularPrice}-${salesPrice}-${color}`;
      if (comboSet.has(comboKey)) {
        displayErrorMessage(`combo-error-${index}`, "Duplicate combo detected.");
        isValid = false;
      } else {
        comboSet.add(comboKey); // Add comboKey to the set if unique
      }
    });
  

  if (images.files.length === 0) {
    displayErrorMessage("images-error", "Please select an image.");
    isValid = false;
  }

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

async function submitForm(event) {
  event.preventDefault();
  console.log("submitForm called"); // Debugging log
  const form = document.getElementById("addProductForm");
  const formData = new FormData(form);

  try {
    const response = await fetch("/admin/addProducts", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    console.log(result); // Debugging log

    if (!response.ok) {
      iziToast.error({
        title: "Error",
        message: result.message || "An error occurred while adding the product.",
        position: "topRight",
      });
    } else {
      iziToast.success({
        title: "Success",
        message: "Product added successfully",
        position: "topRight",
      });
      form.reset();
    }
  } catch (error) {
    console.error("Error:", error); // Debugging log
    iziToast.error({
      title: "Error",
      message: "An unexpected error occurred",
      position: "topRight",
    });
  }
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
  newRow.querySelector(".delete-combo-btn").addEventListener("click", function () {
    newRow.remove();
  });
}