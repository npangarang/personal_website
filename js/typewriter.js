const words = [
  'Data Scientist🤖',
  'Engineer💻',
  'Entrepreneur🚀',
  'Athlete🎾',
  'Gamer🎮',
  'Food Lover🥡',
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

  span.innerHTML = `<span class="typed-cursor">></span> <span class="typed-text">${currentWord}</span>`;

  if (textIndex === words[wordIndex].length + 1 && !isDeleting) {
    isDeleting = true;
    wait = 2000;
  } else if (textIndex === 0 && isDeleting) {
    isDeleting = false;
    wordIndex = (wordIndex + 1) % words.length;
    wait = 0;
  } else {
    wait = isDeleting ? 25 : 50;
  }

  setTimeout(typeWriter, wait);
}

function typeWriterChatBubble() {
  const chatBubble = document.getElementById('chat-bubble');
  const messages = [
    'Hello', 'Bonjour', 'Hola', 'こんにちは', '안녕하세요', 'Ciao',
    'Hallo', 'Привет', '你好', 'سلام', 'שלום', 'नमस्ते',
    'สวัสดี', 'Hej', 'Merhaba', 'Olá', 'Γεια σας', 'Selamat'
  ];
  let currentMessage = 0;
  let textIndex = 0;
  let currentText = '';
  let isDeleting = false;
  let wait = 2000;

  function updateChatBubble() {
    if (isDeleting) {
      currentText = messages[currentMessage].substring(0, textIndex);
      textIndex--;
    } else {
      currentText = messages[currentMessage].substring(0, textIndex);
      textIndex++;
    }

    chatBubble.textContent = currentText;

    if (textIndex === messages[currentMessage].length + 1 && !isDeleting) {
      isDeleting = true;
      wait = 2000;
    } else if (textIndex === 0 && isDeleting) {
      isDeleting = false;
      currentMessage = (currentMessage + 1) % messages.length;
      wait = 0;
    } else {
      wait = isDeleting ? 25 : 50;
    }

    setTimeout(updateChatBubble, wait);
  }

  updateChatBubble();
}


// document.addEventListener('DOMContentLoaded', typeWriter);

document.addEventListener('DOMContentLoaded', function() {
  typeWriter();
  typeWriterChatBubble();
});




