document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname;

    document.querySelectorAll(".sidebar nav a").forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
});
