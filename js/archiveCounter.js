// archiveCounter.js

(function () {
  const counterEl = document.getElementById("archiveCount");
  if (!counterEl) return; 

  const target = 1423;
  const duration = 6660; 
  const frameRate = 60;
  const totalFrames = Math.round((duration / 1000) * frameRate);
  const increment = target / totalFrames;

  let current = 0;
  let frame = 0;

  function animate() {
    frame++;
    current += increment;

    if (frame >= totalFrames) {
      counterEl.textContent = target.toLocaleString();
      counterEl.style.color = "#00ff99";
      return;
    }

    counterEl.textContent = Math.floor(current).toLocaleString();

    
    const hue = (frame * 7) % 360;
    counterEl.style.color = `hsl(${hue}, 100%, 60%)`;

    requestAnimationFrame(animate);
  }

  animate();
})();
