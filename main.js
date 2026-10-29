// Constants and Config
const TOTAL_FRAMES = 240;
const FRAME_DIRECTORY = '/frames';
const IMAGE_PREFIX = 'ezgif-frame-';
const IMAGE_EXTENSION = 'jpg';

// DOM Elements
const canvas = document.getElementById('splash-canvas');
const ctx = canvas.getContext('2d');
const preloader = document.getElementById('preloader');
const progressCircle = document.getElementById('loading-progress-circle');
const percentText = document.getElementById('loading-percent');
const statusText = document.getElementById('loading-status');
const progressBar = document.getElementById('progress-bar');
const soundToggle = document.getElementById('sound-toggle');
const ambientAudio = document.getElementById('ambient-audio');
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.scroll-section');
const scrollContainer = document.querySelector('.scroll-container');
const navItemsStatic = document.querySelectorAll('.nav-item-static');

// Loading Status Messages to show during preloading
const STATUS_MESSAGES = [
  'Chill charging...',
  'Preloading carbonation...',
  'Cooling the can...',
  'Pouring the flavor...',
  'Ready to splash!'
];

// App State
let images = [];
let loadedCount = 0;
let isLoaded = false;

// Scroll & Animation State
let scrollPercent = 0;
let targetFrame = 1;
let currentFrame = 1;

// Circle Progress calculation setup
const CIRCLE_RADIUS = 50;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

/* --- Image Preloader --- */
function preloadImages() {
  return new Promise((resolve) => {
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(3, '0');
      img.src = `${FRAME_DIRECTORY}/${IMAGE_PREFIX}${frameNum}.${IMAGE_EXTENSION}`;
      
      img.onload = () => {
        loadedCount++;
        updateProgress(loadedCount);
        
        if (loadedCount === TOTAL_FRAMES) {
          isLoaded = true;
          setTimeout(() => {
            hidePreloader();
            resolve();
          }, 800); // Small delay to let the user see 100% and provide smooth transition
        }
      };

      img.onerror = () => {
        console.error(`Failed to load frame ${i}`);
        // Count as loaded anyway to not break the loader
        loadedCount++;
        updateProgress(loadedCount);
        
        if (loadedCount === TOTAL_FRAMES) {
          isLoaded = true;
          hidePreloader();
          resolve();
        }
      };

      images.push(img);
    }
  });
}

function updateProgress(count) {
  const percent = Math.floor((count / TOTAL_FRAMES) * 100);
  percentText.textContent = `${percent}%`;
  
  // Update progress ring SVG
  const offset = CIRCLE_CIRCUMFERENCE - (percent / 100) * CIRCLE_CIRCUMFERENCE;
  progressCircle.style.strokeDashoffset = offset;
  
  // Rotate status text messages based on percentage
  const statusIndex = Math.min(
    STATUS_MESSAGES.length - 1, 
    Math.floor((percent / 100) * STATUS_MESSAGES.length)
  );
  statusText.textContent = STATUS_MESSAGES[statusIndex];
}

function hidePreloader() {
  preloader.style.opacity = '0';
  setTimeout(() => {
    preloader.style.display = 'none';
  }, 1000);
  
  // Render first frame immediately once preloader is gone
  renderFrame(0);
}

/* --- High DPI Canvas Drawing --- */
function resizeCanvas() {
  if (!images[0]) return;
  
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  // Re-draw current frame on resize
  renderFrame(Math.round(currentFrame) - 1);
}

function renderFrame(index) {
  const img = images[index];
  if (!img || !img.complete) return;
  
  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvas.width / dpr;
  const canvasHeight = canvas.height / dpr;
  
  // Calculate aspect ratios
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = canvasWidth / canvasHeight;
  
  let renderWidth, renderHeight, x, y;
  
  // Fitting logic: Contain behavior to show the whole splash clearly
  if (imgRatio > canvasRatio) {
    renderWidth = canvasWidth;
    renderHeight = canvasWidth / imgRatio;
    x = 0;
    y = (canvasHeight - renderHeight) / 2;
  } else {
    renderWidth = canvasHeight * imgRatio;
    renderHeight = canvasHeight;
    x = (canvasWidth - renderWidth) / 2;
    y = 0;
  }
  
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(img, x, y, renderWidth, renderHeight);
}

/* --- Scroll Tracking --- */
function handleScroll() {
  if (!isLoaded) return;
  
  const scrollTop = window.scrollY;
  const scrollContainerHeight = scrollContainer.getBoundingClientRect().height;
  const canvasScrollRange = scrollContainerHeight - window.innerHeight;
  
  if (canvasScrollRange <= 0) return;
  
  // Map scroll percent strictly inside the canvas animation bounds
  scrollPercent = Math.min(1.0, Math.max(0, scrollTop / canvasScrollRange));
  
  // Map scroll percentage to frame index (1 to 240)
  targetFrame = Math.min(TOTAL_FRAMES, Math.max(1, Math.ceil(scrollPercent * TOTAL_FRAMES)));
}

/* --- Animation Loop (With Damping) --- */
function updateAnimation() {
  // Linear interpolation: currentFrame slides smoothly to targetFrame
  // Damping of 0.16 makes the scrub animation react faster and tighter
  const ease = 0.16;
  const diff = targetFrame - currentFrame;
  
  if (Math.abs(diff) > 0.05) {
    currentFrame += diff * ease;
    renderFrame(Math.round(currentFrame) - 1);
  } else {
    currentFrame = targetFrame;
    renderFrame(Math.round(currentFrame) - 1);
  }
  
  // Update visual elements
  updateScrollUI();
  
  requestAnimationFrame(updateAnimation);
}

/* --- UI Synchronization --- */
function updateScrollUI() {
  const scrollTop = window.scrollY;
  const scrollContainerHeight = scrollContainer.getBoundingClientRect().height;
  const canvasScrollRange = scrollContainerHeight - window.innerHeight;
  
  // Update progress bar
  progressBar.style.width = `${scrollPercent * 100}%`;
  
  // Update hero text overlay opacity (fades away by 30% scroll of canvas section)
  const heroOverlay = document.getElementById('hero-overlay');
  if (heroOverlay) {
    const opacity = Math.max(0, 1 - (scrollPercent / 0.3));
    heroOverlay.style.opacity = opacity;
    if (opacity === 0) {
      heroOverlay.style.visibility = 'hidden';
      heroOverlay.style.pointerEvents = 'none';
    } else {
      heroOverlay.style.visibility = 'visible';
      heroOverlay.style.pointerEvents = 'auto';
    }
  }
  
  if (scrollTop < canvasScrollRange) {
    // We are inside the canvas scroll animation area
    let activeSectionIndex = -1;
    if (currentFrame >= 25 && currentFrame <= 80) {
      activeSectionIndex = 0;
    } else if (currentFrame > 80 && currentFrame <= 135) {
      activeSectionIndex = 1;
    } else if (currentFrame > 135 && currentFrame <= 190) {
      activeSectionIndex = 2;
    } else if (currentFrame > 190) {
      activeSectionIndex = 3;
    }
    
    // Toggle canvas sections active states
    sections.forEach((section, index) => {
      if (index === activeSectionIndex) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });
    
    // Toggle Nav active state for canvas links
    navItems.forEach((item, index) => {
      const isFirstAndHero = (index === 0 && activeSectionIndex === -1);
      if (index === activeSectionIndex || isFirstAndHero) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Dim all static section links
    navItemsStatic.forEach(item => item.classList.remove('active'));
  } else {
    // We are scrolling past the canvas area, in the static details sections
    // Dim canvas nav links and hide canvas cards
    sections.forEach(section => section.classList.remove('active'));
    navItems.forEach(item => item.classList.remove('active'));
    
    // Determine which static section is visible using bounding rect
    let activeStaticIndex = -1;
    const staticSectionIds = ['#about', '#features', '#nutrition'];
    const scrollPos = window.scrollY + window.innerHeight / 3;
    
    staticSectionIds.forEach((id, i) => {
      const sec = document.querySelector(id);
      if (sec) {
        const top = sec.getBoundingClientRect().top + window.scrollY;
        const height = sec.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          activeStaticIndex = i;
        }
      }
    });
    
    // Toggle active state for static section links
    navItemsStatic.forEach((item, index) => {
      if (index === activeStaticIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}

/* --- Sound / Bubbles Ambient FX --- */
soundToggle.addEventListener('click', () => {
  if (ambientAudio.paused) {
    ambientAudio.play().then(() => {
      soundToggle.classList.add('playing');
    }).catch(err => {
      console.warn('Audio play was prevented by browser:', err);
    });
  } else {
    ambientAudio.pause();
    soundToggle.classList.remove('playing');
  }
});

/* --- Navigation Click Scrolling --- */
navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const sectionIndex = parseInt(item.getAttribute('data-sec'));
    const scrollContainerHeight = scrollContainer.getBoundingClientRect().height;
    const canvasScrollRange = scrollContainerHeight - window.innerHeight;
    
    // Target position is fraction of the canvas animation scroll range
    const targetScrollPoints = [0, 0.33, 0.66, 1.0];
    const targetScrollPercent = targetScrollPoints[sectionIndex];
    
    window.scrollTo({
      top: targetScrollPercent * canvasScrollRange,
      behavior: 'smooth'
    });
  });
});

// Static Navigation Click Scrolling (With offset for header height)
navItemsStatic.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = item.getAttribute('href');
    const targetEl = document.querySelector(targetId);
    if (targetEl) {
      const headerOffset = 90; // Height of glass header + offset buffer
      const elementPosition = targetEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// Anchor scroll for header CTA button (Scrolls to Nutrition details)
document.querySelector('.cta-button').addEventListener('click', (e) => {
  e.preventDefault();
  const targetEl = document.getElementById('nutrition');
  if (targetEl) {
    const headerOffset = 90;
    const elementPosition = targetEl.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.scrollY - headerOffset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
});

/* --- App Initialization --- */
window.addEventListener('resize', resizeCanvas);
window.addEventListener('scroll', handleScroll);

// Kick off loader
preloadImages().then(() => {
  // Canvas setup
  resizeCanvas();
  // Start drawing frames loop
  requestAnimationFrame(updateAnimation);
});
