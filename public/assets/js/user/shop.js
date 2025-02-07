document.addEventListener('DOMContentLoaded', function() {
    const filterForm = document.querySelector('.filter-form');
    const clearFiltersButton = document.getElementById('clear-filters');
    const searchInput = document.getElementById('search');

    let debounceTimeout;

    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            filterForm.submit();
        }, 1000);
    });

    filterForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(filterForm);
        const queryParams = new URLSearchParams(formData).toString();
        window.location.href = `/shop?${queryParams}`;
    });

    clearFiltersButton.addEventListener('click', function() {
        window.location.href = '/shop';
    });
});