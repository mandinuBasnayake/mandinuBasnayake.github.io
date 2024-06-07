// home.js

document.addEventListener('scroll', function () {
    const sections = document.querySelectorAll('.scrollytelling-section');      // Scrolling effect for the web page
    const triggerBottom = window.innerHeight / 5 * 4;

    sections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top;

        if (sectionTop < triggerBottom) {
            section.classList.add('scrolled-into-view');
        } else {
            section.classList.remove('scrolled-into-view');
        }
    });
});