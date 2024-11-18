ABOUT = """
	Hey I'm Neel 👋🏽, a Data Scientist with 2+ years of full-time experience based out of :blue[Austin, TX].

	My professional interests include Machine Learning, Data Science, Full Stack Dev, Cloud, and Startups 👨🏽‍💻.
 
	When I'm not writing code, you can find me playing tennis 🎾, lifting weights 🏋🏽‍♂️, trying new foods 🍔, traveling ✈️, and grinding games like Super Smash Bros Ultimate 🥊 and Chess ♟️.
"""

EDUCATION = {
    'Georgia Institute of Technology': {
        'description': """
            - **:blue[MS Computer Science]** - Machine Learning Specialization
        """,
        'img_path' :'images/georgia-tech-emblem.png',
        'year': '**2024**'
    },
    'The University of Texas at Austin': {
        'description': """
            - **:blue[BS Applied Math & Statistics]** - Computer Science Minor
            - **Activities:** VP of Machine Learning club, Tennis club competitor
        """,
        'img_path' :'images/ut-austin-emblem.png',
        'year': '**2022**'
    }
}

SKILLS = {
    'Languages and Tools': [
		"Python", "SQL", "R", "Java", "JavaScript", "MATLAB", "C++", "Flutter", "Git/GitHub", 
		"Jupyter", "Visual Studio Code"
	],
	'Data Analysis & Visualization': [
		"NumPy", "Pandas", "Plotly/Dash", "Seaborn", "Streamlit", "Matplotlib", 
		"Tableau", "Excel", "Looker"
	],
	'Machine Learning': [
		"Scikit-Learn", "TensorFlow", "Keras", "PyTorch", "XGBoost", "LightGBM", 
		"NLTK", "spaCy", "MLFlow", "SHAP"
	],
	'Modeling': [
		"Classification", "Regression", "Clustering", "Deep Learning", "Reinforcement Learning", 
		"Time Series Analysis", "NLP", "Bayesian Networks", "Dimensionality Reduction", 
		"Feature Engineering"
	],
	'Cloud': [
		"AWS (Sagemaker, Bedrock, S3, EC2)", "Docker", "Airflow", "Azure ML", 
		"Firebase", "GCP"
	]
}

WORK_EXPERIENCE = {
    'Transfix | Data Scientist': {
        'duration': 'Jul 2023 - Jun 2024 · (1yr)',
        'location': 'New York City, NY · Remote',
        'img_path': 'images/transfix_logo.jpeg',
        'description': """
            - Authored the end-to-end development of a novel, bottom-up forecasting model to predict short-term trucking rates for 18,000+ market lanes.
            - Refactored Transfix's core freight pricing algorithm to decrease win-rate bias by over 80%, enhancing model reliability and accuracy.
            - Enhanced Transfix’s freight recommender platform by revising the recommendation algorithm to better serve new and infrequent users, reducing the number of empty recommendations by 45%.
            - Leveraged Docker, GitHub, Airflow, AWS SageMaker, and other tools to manage, monitor, and deploy production models.
        """
    },
    'Dell Technologies | Data Scientist': {
        'duration': 'Jun 2022 - July 2023 · (1yr)',
        'location': 'Austin, TX · Hybrid',
        'img_path': 'images/dell_logo.jpeg',
        'description': """
            - Implemented a BERT model to automate the summarization and classification of customer service cases, saving support agents dozens of hours of manual analysis each week. Experimented with prompt engineering and fine-tuning on various LLM architectures including BART, GPT, and Longformer.
            - Developed an ensemble classification model (Catboost + Autoregressor) to predict server backup failures from server logs, preemptively identifying potential failures and saving Dell approximately $1.2 million annually in compute costs.
            - Forecasted product-level service requests using Prophet models, optimizing agent workload allocation, resulting in a 7% reduction in customer wait times.
        """
    },
    'BarMonkey.io | Founder/Full Stack Developer': {
        'duration': 'Jul 2023 - Aug 2024',
        'location': 'Austin, TX · Remote',
        'img_path': 'images/barmonkey_logo.png',  # Update with the actual image path
        'description': """
            - Building a nightlife companion app that enables users to find local venues, connect with friends, and organize events.
            - Designed and developed the UI/UX using Figma and Flutter while integrating Firebase for back-end infrastructure.
            - Implemented secure user authentication, including OTP verification, with custom APIs built using Node.js, Express, and MongoDB.
            - Developed dynamic geolocation features to recommend personalized venue suggestions based on user proximity and preferences.
            - Scaled back-end architecture for deployment using Docker containers and AWS EC2, ensuring reliability and scalability.
        """
    },
    'Dell Technologies | Data Science Intern (2x)': {
        'duration': 'June 2020 - Aug 2020 | May 2021 - Aug 2021 · (6 mos)',
        'location': 'Austin, TX · Remote',
        'img_path': 'images/dell_logo.jpeg',
        'description': """
        - Implemented a Prophet model and supporting Streamlit app to forecast call-center demand for PowerEdge products.
        - Developed an ensemble of Prophet, SARIMA, TBATs, and ETS time-series models to forecast repeat component dispatches.
        """
    },
    'OnRamps | Data Science Intern': {
        'duration': 'Sep 2020 - April 2021 · (8 mos)',
        'location': 'Austin, TX · Remote',
        'img_path': 'images/onramps_logo.jpeg',
        'description': """
        - Automated auditing and analysis tasks with R scripts, saving 10+ hours of weekly manual analysis.
        - Led a team to develop visualizations, dashboards, and researched API integration and ML-based forecasting approaches.
        """
    }
    
}