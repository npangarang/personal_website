const words = [
    'Data Scientist',
    'Engineer',
    'Entrepreneur',
    'Sports/Fitness enthusiast',
    'Gamer',
  ];
  
  let wordIndex = 0;
  let textIndex = 0;
  let currentWord = '';
  let isDeleting = false;
  let wait = 2000;
  
  function typeWriter() {
    const span = document.getElementById('typewriter-text');
  
    if (isDeleting) {
      currentWord = words[wordIndex].substring(0, textIndex);
      textIndex--;
    } else {
      currentWord = words[wordIndex].substring(0, textIndex);
      textIndex++;
    }
  
    span.innerHTML = `&gt; <span class="typed-text">${currentWord}</span>`;
  
    if (textIndex === words[wordIndex].length && !isDeleting) {
      isDeleting = true;
      wait = 500;
    } else if (textIndex === 0 && isDeleting) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      wait = 1000;
    } else {
      wait = isDeleting ? 50 : 100;
    }
  
    setTimeout(typeWriter, wait);
  }
  
  document.addEventListener('DOMContentLoaded', typeWriter);