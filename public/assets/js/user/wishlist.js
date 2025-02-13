document.addEventListener('DOMContentLoaded', function() {
    const wishlistButtons = document.querySelectorAll('.wishlist-btn');

    wishlistButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            const heartIcon = this.querySelector('.fi-rs-heart');

            try {
                const response = await fetch(`/wishlist/add/${productId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (data.success) {
                    // Change heart color to green
                    heartIcon.style.color = '#00B207';
                    
                    // Show success message
                    iziToast.success({
                        title: 'Success',
                        message: 'Product added to wishlist',
                        position: 'topRight',
                        timeout: 3000
                    });
                } else {
                    throw new Error('Failed to add to wishlist');
                }
            } catch (error) {
                iziToast.error({
                    title: 'Error',
                    message: 'Failed to add product to wishlist',
                    position: 'topRight',
                    timeout: 3000
                });
            }
        });
    });

    // Check if products are already in wishlist and color hearts accordingly
    async function checkWishlistStatus() {
        try {
            const response = await fetch('/wishlist/check-status');
            const data = await response.json();
            
            if (data.wishlistItems) {
                wishlistButtons.forEach(button => {
                    const productId = button.getAttribute('data-product-id');
                    if (data.wishlistItems.includes(productId)) {
                        const heartIcon = button.querySelector('.fi-rs-heart');
                        heartIcon.style.color = '#00B207';
                    }
                });
            }
        } catch (error) {
            console.error('Error checking wishlist status:', error);
        }
    }

    checkWishlistStatus();
});