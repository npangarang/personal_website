from pathlib import Path
import streamlit as st
from PIL import Image
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
SOCIAL_MEDIA = {
    "LinkedIn": "https://www.linkedin.com/in/neel-panging",
    "GitHub": "https://github.com/npangarang",
}

# --- PAGE CONFIG ---
st.set_page_config(page_title=PAGE_TITLE, page_icon=PAGE_ICON)

# --- LOAD CSS, PDF & PROFILE PIC ---
with open(css_file) as f:
    st.markdown("<style>{}</style>".format(f.read()), unsafe_allow_html=True)

# MISC
def stream_text(full_text):
	for word in full_text.split(" "):
		if word == 'BREAK':
			yield word + '\n'
		else:
			yield word + " "
		time.sleep(0.02)

# --- HERO SECTION ---
col1, col2 = st.columns([1, 3])
with col1:
    st.markdown(
        """
        <style>
        .centered-image {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
        }
        </style>
        """, 
        unsafe_allow_html=True
    )
    st.markdown('<div class="centered-image">', unsafe_allow_html=True)
    # st.image('images/pro_pic.png')
    st.markdown('</div>', unsafe_allow_html=True)
    st.image('images/pro_pic.png')
    social_media_links = [
		"https://www.linkedin.com/in/neel-panging",
		"https://github.com/npangarang",
	]
    social_media_icons = SocialMediaIcons(social_media_links)
    social_media_icons.render()
with col2:
    st.title(NAME)
    if 'viewed_about' not in st.session_state:
        st.session_state.viewed_about = False
    if not st.session_state.viewed_about:
        st.write_stream(stream_text(ABOUT))
        st.session_state.viewed_about = True
    else:
        st.write(ABOUT)

# --- SOCIAL LINKS ---
social_media_links = [
    "https://www.linkedin.com/in/neel-panging",
    "https://github.com/npangarang",
]
social_media_icons = SocialMediaIcons(social_media_links)
# social_media_icons.render()
st.write('\n')
st.divider()
# --- SKILLS ---
st.markdown('## Skills 🛠️')
for category, skills in SKILLS.items():
    st.write(f'**:blue[{category}]**: {", ".join(skills)}')
st.divider()

# --- WORK HISTORY ---
st.markdown('## Experience 💼')
for exp, info in WORK_EXPERIENCE.items():
    company, role = exp.split(' | ')
    col1, col2 = st.columns([1, 10])
    col1.image(info['img_path'])
    col2.subheader(f'{company} | {role}')
    st.write(f'🗓️ **{info["duration"]}**')
    st.write(f'📍 **{info["location"]}**')
    st.write(info['description'])
    st.write()
st.divider()

# --- EDUCATION ---
st.markdown('## Education 🎓')
for school, info in EDUCATION.items():
    col1, col2 = st.columns([1,10])
    col1.image(info['img_path'])
    col2.write(f'### {school}')
    col3, col4 = st.columns([8,1])
    col3.write(info['description'])
    col4.write(f'🗓️ {info["year"]}')
    st.write()
    # st.write("---")
st.divider()