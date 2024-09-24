import streamlit as st
from streamlit_option_menu import option_menu
from st_social_media_links import SocialMediaIcons
import time
from data import ABOUT, EDUCATION, SKILLS, WORK_EXPERIENCE

st.set_page_config(page_title="Neel Panging", layout="wide")
st.markdown(
    """
    <style>
    /* Increase font size for all text */
    div[data-testid="stMarkdownContainer"] p {
        font-size: 20px;  /* Adjust this to change the global font size */
        line-height: 1.6; /* Optional: Adjust line spacing */
    }
    </style>
    """,
    unsafe_allow_html=True
)
with st.sidebar:
    _, col, _ = st.columns([1,3,1])
    with col:
        st.image("images/pro_pic.png")
    page = option_menu(
		"Neel Panging", 
		['About', 'Experience', 'Education', 'Skills'],
		icons=['person fill', 'building', 'mortarboard', 'tools',],
		menu_icon="None",
		default_index=0,
		styles={
			# "container": {"padding": "0!important"},
   			"menu-title": {"text-align": "center"},
			"icon": {"font-size": "20px"}, 
			"nav-link": {"font-size": "17px", "text-align": "left", "margin":"0px"},
			# "nav-link-selected": {"background-color": "grey"},
		}
	)
    social_media_links = [
		"https://www.linkedin.com/in/neel-panging",
		"https://github.com/npangarang",
	]
    social_media_icons = SocialMediaIcons(social_media_links)
    social_media_icons.render()
    st.sidebar.markdown(
		"""
		<br>
		<div style="text-align: center;">
			<a href="mailto:neelpanging@live.com" style="text-decoration: none;">hmu! ✉️</a>
		</div>
		""", 
		unsafe_allow_html=True
	)
def stream_text(full_text):
	for word in full_text.split(" "):
		if word == 'BREAK':
			yield word + '\n'
		else:
			yield word + " "
		time.sleep(0.02)
        
if page == 'About':
	if 'viewed_about' not in st.session_state:
		st.session_state.viewed_about = False
	if not st.session_state.viewed_about:
		st.write_stream(stream_text(ABOUT))
		st.session_state.viewed_about = True
	else:
		st.write(ABOUT)

elif page == 'Experience':
	st.markdown('## Experience 💼')
	st.divider()
	for exp, info in WORK_EXPERIENCE.items():
		company, role = exp.split(' | ')
		col1, col2 = st.columns([1,10])
		col1.image(info['img_path'])
		col2.subheader(f':blue[{company}] | {role}')
		st.write(f'🗓️ **{info["duration"]}**')
		st.write(f'📍 **{info["location"]}**')
		st.write(info['description'])
		st.divider()

elif page == 'Education':
	st.markdown('## Education 🎓')
	st.divider()
	for school, info in EDUCATION.items():
		col1, col2 = st.columns([1,10])
		col1.image(info['img_path'])
		col2.write(f'### {school}')
		st.write(info['description'])
		st.divider()
   
elif page == 'Skills':
	st.markdown('## Skills 🛠️')
	st.divider()
	for category, skills in SKILLS.items():
		st.write(f'**:blue[{category}]**: {", ".join(skills)}')