import streamlit as st
from streamlit_option_menu import option_menu
import time
from data import ABOUT, EDUCATION, SKILLS, WORK_EXPERIENCE

st.set_page_config(page_title="Neel Panging", layout="wide")

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

def stream_text(full_text):
	for word in full_text.split(" "):
		if word == 'BREAK':
			yield word + '\n'
		else:
			yield word + " "
		time.sleep(0.02)
        
if page == 'About':
	st.markdown('## About 🥷🏼')
	with st.container(border=True):
		if 'viewed_about' not in st.session_state:
			st.session_state.viewed_about = False
		if not st.session_state.viewed_about:
			st.write_stream(stream_text(ABOUT))
			st.session_state.viewed_about = True
		else:
			st.write(ABOUT)
	col1, col2, col3, _ = st.columns([1,1,1,5])
	with col1:
		st.markdown('[![Linkedin](https://img.icons8.com/?size=50&id=8808&format=png&color=4338C5)](https://www.linkedin.com/in/neel-panging)')
	with col2:
		st.markdown('[![Github](https://img.icons8.com/?size=50&id=12599&format=png&color=4338C5)](https://github.com/npangarang)')
	with col3:
		st.markdown('[![Email](https://img.icons8.com/?size=50&id=60688&format=png&color=4338C5)](mailto:neelpanging@live.com)')


elif page == 'Experience':
	st.markdown('## Experience 💼')
	for exp, info in WORK_EXPERIENCE.items():
		with st.container(border=True):
			company, role = exp.split(' | ')
			col1, col2 = st.columns([1,10])
			col1.image(info['img_path'])
			col2.subheader(f':blue[{company}] | {role}')
			st.write(f'🗓️ **{info["duration"]}**')
			st.write(f'📍 **{info["location"]}**')
			st.write(info['description'])

elif page == 'Education':
	st.markdown('## Education 🎓')
	for school, info in EDUCATION.items():
		with st.container(border=True):
			col1, col2 = st.columns([1,10])
			col1.image(info['img_path'])
			col2.write(f'### {school}')
			st.write(info['description'])
   
elif page == 'Skills':
	st.markdown('## Skills 🛠️')
	with st.container(border=True):
		for category, skills in SKILLS.items():
			st.write(f'**:blue[{category}]**: {", ".join(skills)}')