function addOffer(productId) {
    Swal.fire({
        title: 'Enter the offer percentage:',
        input: 'number',
        inputAttributes: {
            min: 0,
            max: 100,
            step: 1
        },
        showCancelButton: true,
        confirmButtonText: 'OK',
        showLoaderOnConfirm: true,
        preConfirm: (offer) => {
            offer = parseFloat(offer); // Ensure the offer is parsed as a number
            if (isNaN(offer) || offer < 0 || offer > 100) {
                Swal.showValidationMessage('Please enter a valid offer percentage between 0 and 100');
                return false;
            }
            return fetch(`/admin/addOffer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productId, offer })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.json();
            })
            .catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Offer added successfully',
                icon: 'success'
            }).then(() => {
                location.reload();
            });
        }
    });
}

function removeOffer(productId) {
    Swal.fire({
        title: 'Are you sure you want to remove the offer?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, remove it!',
        showLoaderOnConfirm: true,
        preConfirm: () => {
            return fetch(`/admin/removeOffer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productId })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }
                return response.json();
            })
            .catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });
        },
        allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Offer removed successfully',
                icon: 'success'
            }).then(() => {
                location.reload();
            });
        }
    });
}


function confirmBlock(productId) {
    Swal.fire({
        title: 'Are you sure you want to block this product?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, block it!',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `/admin/blockProduct?id=${productId}`;
        }
    });
}

function confirmUnblock(productId) {
    Swal.fire({
        title: 'Are you sure you want to unblock this product?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, unblock it!',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `/admin/unblockProduct?id=${productId}`;
        }
    });
}