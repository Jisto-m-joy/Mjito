document.addEventListener("DOMContentLoaded", function () {
    const brandForm = document.getElementById("brandForm");
    const brandName = document.getElementById("brandName");
    const brandDescription = document.getElementById("brandDescription");
    const brandImage = document.getElementById("brandImage");
    const cropModal = new bootstrap.Modal(document.getElementById("cropModal"));
    const imageToCrop = document.getElementById("imageToCrop");
    let cropper;

    brandForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      let valid = true;

      // Clear previous error messages
      document.getElementById("brandNameError").innerText = '';
      document.getElementById("brandDescriptionError").innerText = '';
      document.getElementById("brandImageError").innerText = '';

      if (!brandName.value) {
        document.getElementById("brandNameError").innerText = 'Brand name is required.';
        valid = false;
      }

      if (!brandDescription.value) {
        document.getElementById("brandDescriptionError").innerText = 'Brand description is required.';
        valid = false;
      }

      if (!brandImage.files.length) {
        document.getElementById("brandImageError").innerText = 'Brand image is required.';
        valid = false;
      } else {
        const file = brandImage.files[0];
        const validImageTypes = ['image/webp', 'image/png', 'image/jpeg'];
        if (!validImageTypes.includes(file.type)) {
          document.getElementById("brandImageError").innerText = 'Only webp, png, and jpg files are allowed.';
          valid = false;
        }
      }

      if (!valid) {
        return;
      }

      try {
        const response = await fetch(`/admin/checkBrandExists?name=${brandName.value}`);
        const data = await response.json();
        if (data.exists) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Brand already exists.'
          });
          return;
        }
        brandForm.submit();
      } catch (error) {
        console.error('Error checking brand existence:', error);
      }
    });

    brandImage.addEventListener("change", function () {
      const file = brandImage.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = function (e) {
          imageToCrop.src = e.target.result;
          cropModal.show();
          cropper = new Cropper(imageToCrop, {
            aspectRatio: 1,
            viewMode: 1,
          });
        };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById("cropButton").addEventListener("click", function () {
      const canvas = cropper.getCroppedCanvas({
        width: 300,
        height: 300,
      });
      canvas.toBlob(function (blob) {
        const url = URL.createObjectURL(blob);
        const croppedImage = new File([blob], brandImage.files[0].name, {
          type: brandImage.files[0].type,
        });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(croppedImage);
        brandImage.files = dataTransfer.files;
        cropModal.hide();
        iziToast.success({
          title: "Success",
          message: "Image cropped successfully.",
        });
      });
    });
  });

  function confirmAction(brandId, action) {
    const actionText = action === 'delete' ? 'delete' : 'restore';
    const actionColor = action === 'delete' ? 'red' : 'green';
    Swal.fire({
      title: `Are you sure you want to ${actionText} this brand?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: `#${actionColor}`,
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, do it!'
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          url: `/admin/toggleBrandBlockStatus?id=${brandId}`,
          type: 'GET',
          success: function (result) {
            Swal.fire(
              'Success!',
              `Brand has been ${actionText}d.`,
              'success'
            ).then(() => {
              location.reload();
            });
          },
          error: function (err) {
            Swal.fire(
              'Error!',
              'Failed to change brand status.',
              'error'
            );
          }
        });
      }
    });
  }


  