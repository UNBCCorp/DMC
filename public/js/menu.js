 document.addEventListener('DOMContentLoaded', function() {
     const navLinks = document.querySelectorAll('#sidebarNav a');

     const currentPath = window.location.pathname.split("/").pop(); 
     let foundActive = false;
     navLinks.forEach(link => {
        const linkPath = link.getAttribute('href').split("/").pop();
        if (linkPath === currentPath) {
             link.classList.add('active');
             foundActive = true;
        } else {
             link.classList.remove('active');
        }
     });

     if (!foundActive && (currentPath === '' || currentPath === 'index.php')) {
         const monitorLink = document.querySelector('#sidebarNav a[href*="Monitor.php"]');
         if (monitorLink) {
             monitorLink.classList.add('active');
         }
     }


 });
