export const ABOUT = `Hey I'm Neel 👋🏽, a Data Scientist with 3+ years of experience based out of Austin, TX. I have a strong background in Math (B.S. UT Austin '22) and Computer Science (M.S. Georgia Tech '24), and I love building cool stuff with data 🤖.

My professional interests include Machine Learning, Data Science, Full Stack Dev, Cloud, and Startups 👨🏽‍💻.

When I'm not writing code, you can find me playing racket sports 🎾, lifting weights 🏋🏽‍♂️, eating food 🍔, traveling ✈️, and grinding games like Super Smash Bros Ultimate 🥊 and Chess ♟️.`;

export const EDUCATION = [
  {
    school: "Georgia Institute of Technology",
    degree: "MS Computer Science — Machine Learning Specialization",
    year: "June 2024",
    location: "Atlanta, GA (Remote)",
  },
  {
    school: "The University of Texas at Austin",
    degree: "BS Applied Mathematics | Minors in Computer Science and Statistics",
    year: "December 2021",
    location: "Austin, TX",
  },
];

export const SKILLS: Record<string, string[]> = {
  "Languages and Tools": ["Python", "SQL", "R"],
  "Data Analysis & Visualization": [
    "NumPy", "Pandas", "Plotly/Dash", "Seaborn", "Streamlit", "Matplotlib", "Looker",
  ],
  "Machine Learning": [
    "Scikit-Learn", "TensorFlow", "Keras", "PyTorch", "XGBoost", "LightGBM",
    "NLTK", "spaCy", "MLFlow", "SHAP",
  ],
  "Data Science & Modeling": [
    "Classification", "Regression", "Clustering", "Deep Learning", "Reinforcement Learning",
    "Time Series Analysis", "NLP", "Bayesian Networks", "Dimensionality Reduction",
    "Feature Engineering",
  ],
  Cloud: [
    "AWS (Sagemaker, Bedrock, S3, EC2)", "Docker", "Airflow", "Supabase", "Firebase",
  ],
};

export const WORK_EXPERIENCE = [
  {
    company: "Transfix",
    role: "Data Scientist II",
    duration: "July 2023 - Present · (2yrs)",
    location: "Austin, TX (Remote)",
    description:
      "Pricing algorithms, forecasting, and recommender systems for freight markets 🚛",
  },
  {
    company: "Dell Technologies",
    role: "Data Scientist I",
    duration: "June 2022 - July 2023 · (1yr)",
    location: "Austin, TX",
    description:
      "Built Gen AI and Machine Learning models to automate case analysis, predict server failures, and optimize service forecasting.",
  },
  {
    company: "BarMonkey.io",
    role: "Founder/Full Stack Developer",
    duration: "Jul 2023 - Present",
    location: "Remote",
    description:
      "Building a nightlife companion app, enabling users to find local venues, connect with friends, and organize events.",
  },
  {
    company: "Dell Technologies (Intern)",
    role: "Data Science Intern",
    duration: "June - Aug 2020 | May - Aug 2021",
    location: "Remote",
    description:
      "Implemented a Prophet model and supporting Streamlit app to forecast call-center demand for PowerEdge products (first summer). Developed an ensemble of Prophet, SARIMA, TBATs, and ETS time-series models to forecast repeat component dispatches (second summer).",
  },
  {
    company: "OnRamps",
    role: "Data Science Intern",
    duration: "Sep 2020 - Apr 2021 · (8 mos)",
    location: "Austin, TX",
    description:
      "Automated auditing and analysis tasks with R scripts, saving 10+ hours of weekly manual analysis.",
  },
];

export const CONTACT = [
  { label: "Email", value: "neel@example.com", link: "mailto:neel@example.com" },
  { label: "LinkedIn", value: "linkedin.com/in/neel", link: "https://linkedin.com/in/neel" },
  { label: "GitHub", value: "github.com/neel", link: "https://github.com/neel" },
];

export const ASCII_BANNER = `
\x1b[cyan]╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███╗   ██╗███████╗███████╗██╗                               ║
║   ████╗  ██║██╔════╝██╔════╝██║                               ║
║   ██╔██╗ ██║█████╗  █████╗  ██║                               ║
║   ██║╚██╗██║██╔══╝  ██╔══╝  ██║                               ║
║   ██║ ╚████║███████╗███████╗███████╗                           ║
║   ╚═╝  ╚═══╝╚══════╝╚══════╝╚══════╝                          ║
║                                                               ║
║   Data Scientist · ML Engineer · Builder                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝\x1b[/cyan]

Type \x1b[cmd:help]help\x1b[/cmd] to see available commands.
`;

export const AVAILABLE_COMMANDS = [
  "help",
  "about",
  "education",
  "skills",
  "experience",
  "contact",
  "clear",
];
