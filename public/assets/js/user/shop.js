document.addEventListener('DOMContentLoaded', function() {
    const filterForm = document.querySelector('.filter-form');
    const clearFiltersButton = document.getElementById('clear-filters');

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