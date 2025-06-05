from pathlib import Path
import streamlit as st
from st_social_media_links import SocialMediaIcons
from data import ABOUT, EDUCATION, SKILLS, WORK_EXPERIENCE
import time

# --- PATH SETTINGS ---
current_dir = Path(__file__).parent if "__file__" in locals() else Path.cwd()
css_file = current_dir / "styles" / "main.css"

# --- GENERAL SETTINGS ---
PAGE_TITLE = "Neel's Portfolio"
PAGE_ICON = ":rocket:"
NAME = "Neel Panging"
EMAIL = "neelpanging@live.com"
IMG_WIDTH = 250

# --- PAGE CONFIG ---
st.set_page_config(page_title=PAGE_TITLE, page_icon=PAGE_ICON)

# --- LOAD CSS ---
with open(css_file) as f:
    st.markdown("<style>{}</style>".format(f.read()), unsafe_allow_html=True)

# MISC
def stream_text(full_text):
	for word in full_text.split(" "):
		if word == 'BREAK':
			yield word + '\\n'
		else:
			yield word + " "
		time.sleep(0.02)

# --- TABS ---
tab_titles = ["👋🏽 Hey!", "💼 Experience", "👨🏽‍💻 Skills"]
tab_about, tab_experience, tab_skills = st.tabs(tab_titles)

with tab_about:
    col1, col2 = st.columns([1, 3]) # Adjust ratio as needed

    with col1:
        st.image('images/pro_pic2.png', width=IMG_WIDTH)
        social_media_links = [
            "https://www.github.com/npangarang",
            "https://www.linkedin.com/in/neel-panging",
            "mailto:neelpanging@live.com"
        ]
        social_media_icons = SocialMediaIcons(social_media_links)

        social_media_icons.render() 
        st.markdown("<br>", unsafe_allow_html=True) # Adding some space
        st.link_button("Resume", "https://drive.google.com/file/d/1i6pjN-PHud6NMyLK4FVPkCOSyrlLrXcc/view?usp=sharing", use_container_width=True, icon=":material/description:", type="primary")

    with col2:
        if 'viewed_about' not in st.session_state:
            st.session_state.viewed_about = False
        if not st.session_state.viewed_about:
            st.write_stream(stream_text(ABOUT))
            st.session_state.viewed_about = True
        else:
            st.write(ABOUT)

with tab_experience:
    for exp, info in WORK_EXPERIENCE.items():
        company, role = exp, info['role']
        exp_col1, exp_col2 = st.columns([1, 10])
        with exp_col1:
            exp_col1.image(info['img_path'], width=IMG_WIDTH)
        with exp_col2:
            exp_col2.subheader(f'{company} | :blue[{role}]')
        # Details below the subheader, not necessarily in exp_col2 but associated with the entry
        st.write(f'🗓️ **{info["duration"]}**')
        st.write(f'📍 **{info["location"]}**')
        st.write(info['description'])
        st.divider() # Adds a little space between experiences

with tab_skills:
    for category, skills_list in SKILLS.items(): # Renamed skills to skills_list to avoid conflict
        st.write(f'**:blue[{category}]**: {", ".join(skills_list)}')