document.addEventListener('DOMContentLoaded', function() {
    const wishlistButtons = document.querySelectorAll('.wishlist-btn');

    wishlistButtons.forEach(button => {
        const productId = button.getAttribute('data-product-id');
        if (!productId) {
            console.error('No product ID found for wishlist button');
            return;
        }
        
        checkProductWishlistStatus(productId, button);
        
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            
            if (!productId) {
                console.error('No product ID found');
                return;
            }

            const heartIcon = this.querySelector('.fi-rs-heart');
            const isInWishlist = heartIcon.style.color === 'rgb(0, 178, 7)'; // #00B207

            try {
                let response;
                if (!isInWishlist) {
                    response = await fetch(`/wishlist/add/${productId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'same-origin' // Important for session cookies
                    });
                } else {
                    response = await fetch(`/wishlist/remove/${productId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'same-origin' // Important for session cookies
                    });
                }

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();

                if (data.success) {
                    if (!isInWishlist) {
                        heartIcon.style.color = '#00B207';
                        iziToast.success({
                            title: 'Success',
                            message: 'Product added to wishlist',
                            position: 'topRight',
                            timeout: 3000
                        });
                    } else {
                        heartIcon.style.color = '';
                        iziToast.success({
                            title: 'Success',
                            message: 'Product removed from wishlist',
                            position: 'topRight',
                            timeout: 3000
                        });
                    }
                } else {
                    throw new Error(data.error || 'Operation failed');
                }
            } catch (error) {
                console.error('Wishlist operation error:', error);
                iziToast.error({
                    title: 'Error',
                    message: error.message || 'Failed to update wishlist',
                    position: 'topRight',
                    timeout: 3000
                });
            }
        });
    });


    // Check individual product wishlist status
    async function checkProductWishlistStatus(productId, button) {
        try {
            const response = await fetch(`/wishlist/check-status?productId=${productId}`);
            const data = await response.json();
            
            if (data.success && data.inWishlist) {
                const heartIcon = button.querySelector('.fi-rs-heart');
                heartIcon.style.color = '#00B207';
            }
        } catch (error) {
            console.error('Error checking wishlist status:', error);
        }
    }
});