// Example: Add a simple alert on clicking a navigation link
document.querySelectorAll('.navigation a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Navigation link clicked!');
    });
});

let currentIndex = 0;
const images = document.querySelectorAll('.left-image');
const totalImages = images.length;

function showNextImage() {
    images[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % totalImages;
    images[currentIndex].classList.add('active');
}

setInterval(showNextImage, 10000); // Change image every 10 seconds

// Initialize the first image
images[currentIndex].classList.add('active'); 