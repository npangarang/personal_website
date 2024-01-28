const words = [
  'Data Scientist 🤖',
  'Engineer 💻',
  'Entrepreneur 🚀',
  'Athlete 🎾',
  'Gamer 🎮',
  'Food Lover 🥡',
];

let wordIndex = 0;
let textIndex = 0;
let currentWord = '';
let isDeleting = false;
let wait = 2000;

let currentLiIndex = 0; // Initialize the current list item index
let liElements = document.querySelectorAll('#experience-list li'); // Select all list items
let job_descriptions = Array.from(liElements).map(li => li.innerText); // Extract text from each list item



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
  let wait = 4000;

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
      wait = isDeleting ? 50 : 75;
    }

    setTimeout(updateChatBubble, wait);
  }

  updateChatBubble();
}


let jobWordIndex = 0;
let jobTextIndex = 0;
let isDeletingExp = false;

let jobDescriptions = {
  'experience-list-1': [
    'Building, Deploying, and Improving models in Freight Tech. 🚚',
  ],
  'experience-list-2': [
    "Automated case classification using BERT and experimented with summarization architectures such as BART, USE, and Longformer.",
    "Utilized GPT-4 and Midjourney to generate short-form media content for Dell's Knowledge Base Articles (troubleshooting guides).",
    "Developed an ensemble model (Catboost + Autoregressor) to predict and mitigate server backup failures from telemetry data, resulting in an estimated savings of up to 1.2 million dollars annually.",
    "Forecasted product-level service requests using Prophet models, optimizing agent workload allocation."
  ],
  'experience-list-3': [
    "Implemented Prophet, SARIMA, TBATs, and ETS models and engineered additional configurations to improve forecast accuracy.",
    "Built a user-friendly web app using Streamlit and Prophet for service center demand forecasting."
  ],
  'experience-list-4': [
    "Automated auditing and analysis with R scripts, and built Seaborn visualizations and Smartsheet dashboards for performance reporting.",
    "Led a team to develop visualizations, dashboards, and researched API integration and ML-based forecasting approaches."
  ]
  // ...more jobs
};

function typeWriterExperiences(spanID, descriptions) {
  let jobTextIndex = 0;
  let jobWordIndex = 0;
  let isDeletingExp = false;
  let wait = 2000;
  let currentWord = '';
  const span = document.getElementById(spanID);

  function type() {
    if (isDeletingExp) {
      // Remove character
      currentWord = descriptions[jobWordIndex].substring(0, jobTextIndex - 1);
      jobTextIndex--;
    } else {
      // Add character
      currentWord = descriptions[jobWordIndex].substring(0, jobTextIndex + 1);
      jobTextIndex++;
    }

    // Update HTML with current word and cursor
    span.innerHTML = `<span class="typed-cursor">></span><span class="typed-text">${currentWord}</span>`;

    if (!isDeletingExp && jobTextIndex === descriptions[jobWordIndex].length) {
      // Finish typing the current word
      isDeletingExp = true;
      wait = 3000; // Wait a bit longer after finishing typing
    } else if (isDeletingExp && jobTextIndex === 0) {
      // Move to the next word
      isDeletingExp = false;
      jobWordIndex = (jobWordIndex + 1) % descriptions.length;
      wait = 50; // Wait before starting the new word
    } else {
      wait = isDeletingExp ? 10 : 50; // Typing speed
    }
    setTimeout(type, wait);
  }

  type();
}

document.addEventListener('DOMContentLoaded', function() {
  typeWriter();
  typeWriterChatBubble();
  // typeWriterExperiences();
  for (const [listID, descriptions] of Object.entries(jobDescriptions)) {
    const spanID = listID.replace('list', 'experiences'); // Assuming your span IDs follow this pattern.
    // console.log(listID, descriptions)
    typeWriterExperiences(listID, descriptions);
  }

  const badges = document.querySelectorAll('.badge');
  const colors = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3',
    '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
    '#FFC107', '#FF9800', '#FF5722'
  ];

    badges.forEach(function(badge) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      badge.style.backgroundColor = randomColor;
    });

});




