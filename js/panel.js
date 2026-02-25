// panel.js — Layer toggle buttons and panel interaction logic

document.addEventListener('DOMContentLoaded', function() {

  const toggleBtns = document.querySelectorAll('.toggle-btn');

  toggleBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {

      // Update active button state
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const layer = btn.getAttribute('data-layer');

      if (layer === 'mha') {
        window.showMhaLayer && window.showMhaLayer();
      } else if (layer === 'category') {
        window.showCategoryLayer && window.showCategoryLayer();
      }

    });
  });

});
