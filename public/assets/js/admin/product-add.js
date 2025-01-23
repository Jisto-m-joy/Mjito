function validateAndSubmit(event) {
  event.preventDefault();
  if (validateForm()) {
    submitForm(event);
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
  const price = document.getElementsByName("regularPrice")[0].value;
  const salesprice = document.getElementsByName("salesPrice")[0].value;
  const color = document.getElementsByName("color")[0].value;
  const category = document.getElementsByName("category")[0].value;
  const images = document.getElementById("input1");
  const quantity = document.getElementsByName("quantity")[0].value;
  let isValid = true;

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

  if (parseInt(quantity) < 0 || isNaN(parseInt(quantity))) {
    displayErrorMessage(
      "quantity-error",
      "Please enter a valid non-negative quantity."
    );
    isValid = false;
  }

  if (
    !/^\d+(\.\d{1,2})?$/.test(price) ||
    parseFloat(price) < 0 ||
    isNaN(parseFloat(price))
  ) {
    displayErrorMessage(
      "regularPrice-error",
      "Please enter a valid non-negative price."
    );
    isValid = false;
  }

  if (
    !/^\d+(\.\d{1,2})?$/.test(salesprice) ||
    parseFloat(salesprice) < 0 ||
    isNaN(parseFloat(salesprice))
  ) {
    displayErrorMessage(
      "salePrice-error",
      "Please enter a valid non-negative price."
    );
    isValid = false;
  }

  if (parseFloat(price) <= parseFloat(salesprice)) {
    displayErrorMessage(
      "regularPrice-error",
      "Regular price must be greater than sale price."
    );
    isValid = false;
  }

  if (color.trim() === "") {
    displayErrorMessage("color-error", "Please enter a color.");
    isValid = false;
  }

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
        message:
          result.message || "An error occurred while adding the product.",
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
