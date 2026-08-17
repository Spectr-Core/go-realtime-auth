// DOM Elements
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');
const navItems = document.querySelectorAll('.nav-item');

// Toggle sidebar
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Active navigation
navItems.forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Remove active class from all items
    navItems.forEach(nav => nav.classList.remove('active'));
    
    // Add active class to clicked item
    this.classList.add('active');
    
    // Simulate page change (in real app, load content dynamically)
    const page = this.getAttribute('href').substring(1);
    console.log(`Navigating to: ${page}`);
    
    // Add smooth animation
    this.style.transform = 'scale(0.95)';
    setTimeout(() => {
      this.style.transform = 'scale(1)';
    }, 100);
  });
});

// Mobile menu toggle
if (window.innerWidth <= 768) {
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
  });
}

// Animate stats on load
window.addEventListener('load', () => {
  const statValues = document.querySelectorAll('.stat-value');
  
  statValues.forEach(stat => {
    const finalValue = stat.textContent;
    const isNumber = !finalValue.includes('$') && !finalValue.includes('%');
    
    if (isNumber) {
      let current = 0;
      const target = parseInt(finalValue.replace(/,/g, ''));
      const increment = target / 50;
      
      const counter = setInterval(() => {
        current += increment;
        if (current >= target) {
          stat.textContent = finalValue;
          clearInterval(counter);
        } else {
         
        }
      }, 20);
    }
  });
});

// Animate progress bars
const progressFills = document.querySelectorAll('.progress-fill');
progressFills.forEach(fill => {
  const width = fill.style.width;
  fill.style.width = '0%';
  setTimeout(() => {
    fill.style.width = width;
  }, 500);
});

// Notification button animation
const notificationBtn = document.querySelector('.notification-btn');
if (notificationBtn) {
  notificationBtn.addEventListener('click', () => {
    const badge = notificationBtn.querySelector('.badge');
    if (badge) {
      badge.style.animation = 'ping 0.5s ease';
      setTimeout(() => {
        badge.style.animation = '';
      }, 500);
    }
  });
}

// Add ping animation
const style = document.createElement('style');
style.textContent = `
  @keyframes ping {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.5);
      opacity: 0.5;
    }
  }
`;
document.head.appendChild(style);

// Dark mode toggle (placeholder)
const darkModeBtn = document.querySelector('.top-bar-actions .icon-btn:nth-child(3)');
if (darkModeBtn) {
  darkModeBtn.addEventListener('click', () => {
    console.log('Dark mode toggle clicked (feature to be implemented)');
  });
}

// Handle window resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.innerWidth > 768) {
      sidebar.classList.remove('active');
    }
  }, 250);
});

// Smooth scroll for activity items
const activityItems = document.querySelectorAll('.activity-item');
activityItems.forEach((item, index) => {
  item.style.opacity = '0';
  item.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    item.style.transition = 'all 0.5s ease';
    item.style.opacity = '1';
    item.style.transform = 'translateY(0)';
  }, index * 100);
});
