let currentCropper = null;

        function validateAndSubmit() {
            return validateForm();
        }

        function replaceImage(event, imageName, index) {
            const input = event.target;
            const file = input.files[0];
            const reader = new FileReader();
            input.name = `replace_${imageName}`;

            reader.onload = function(e) {
                const imgElement = document.getElementById(`cropperImg${index}`);
                imgElement.src = e.target.result;

                const cropperContainer = document.getElementById(`cropperContainer${index}`);
                cropperContainer.style.display = 'flex';

                if (currentCropper) {
                    currentCropper.destroy();
                }

                currentCropper = new Cropper(imgElement, {
                    aspectRatio: 1,
                    viewMode: 2,
                    guides: true,
                    background: false,
                    autoCropArea: 1,
                    zoomable: true
                });

                const saveButton = document.getElementById(`saveButton${index}`);
                saveButton.addEventListener('click', async function() {
                    const croppedCanvas = currentCropper.getCroppedCanvas();
                    const productImg = document.getElementById(`productImg${index}`);
                    productImg.src = croppedCanvas.toDataURL('image/webp', 1.0);
                    const timestamp = new Date().getTime();
                    const fileName = `cropped-img-${timestamp}-${index}.webp`;

                    await croppedCanvas.toBlob(blob => {
                        const imgFile = new File([blob], fileName, { type: 'image/webp' });
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(imgFile);
                        input.files = dataTransfer.files;
                    });

                    cropperContainer.style.display = 'none';
                    currentCropper.destroy();
                    currentCropper = null;
                }, { once: true });
            };

            reader.readAsDataURL(file);
        }

        function validateForm() {
        clearErrorMessages();
        const name = document.getElementsByName('productName')[0].value;
        const description = document.getElementById('descriptionid').value;
        const salesPrice = document.getElementsByName('salePrice')[0].value;
        const regularPrice = document.getElementsByName('regularPrice')[0].value;
        const brand = document.getElementsByName('brand')[0].value;
        const category = document.getElementsByName('category')[0].value;
        const quantity = document.getElementsByName('quantity')[0].value;
        let isValid = true;

        if (name.trim() === "") {
            displayErrorMessage('productName-error', 'Please enter a product name.');
            isValid = false;
        } else if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
            displayErrorMessage('productName-error', 'Product name should contain only alphabetic characters.');
            isValid = false;
        }

        if (description.trim() === "") {
            displayErrorMessage('description-error', 'Please enter a product description.');
            isValid = false;
        } // Removed the alphabetic characters validation for description

        if (!/^\d+(\.\d{1,2})?$/.test(quantity) || parseFloat(quantity) < 0) {
            displayErrorMessage('quantity-error', 'Please enter a valid non-negative quantity.');
            isValid = false;
        }

        if (!/^\d+(\.\d{1,2})?$/.test(regularPrice) || parseFloat(regularPrice) < 0) {
            displayErrorMessage('regularPrice-error', 'Please enter a valid non-negative price.');
            isValid = false;
        }

        if (!/^\d+(\.\d{1,2})?$/.test(salesPrice) || parseFloat(salesPrice) < 0 || parseFloat(salesPrice) >= parseFloat(regularPrice)) {
            displayErrorMessage('salePrice-error', 'Please enter a valid non-negative sale price lower than the original price.');
            isValid = false;
        }

        if (brand.trim() === "") {
            displayErrorMessage('brand-error', 'Please select a brand.');
            isValid = false;
        }

        if (category.trim() === "") {
            displayErrorMessage('category-error', 'Please select a category.');
            isValid = false;
        }

        return isValid;
    }

    function displayErrorMessage(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.innerText = message;
        errorElement.style.display = "block";
    }

    function clearErrorMessages() {
        const errorElements = document.getElementsByClassName('error-message');
        Array.from(errorElements).forEach(element => {
            element.innerText = '';
        });
    }