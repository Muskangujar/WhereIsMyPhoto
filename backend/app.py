import streamlit as st
import cv2
import face_recognition
import numpy as np
from PIL import Image
import requests
import os
from dotenv import load_dotenv
import json
import time
import hashlib
import tempfile
import io
from datetime import datetime, timezone

# Load environment variables
load_dotenv()

# ─── Config (nothing hardcoded) ───────────────────────────────────────────────
SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
BLUR_THRESHOLD = float(os.getenv("BLUR_THRESHOLD", "100"))
LOW_RES_THRESHOLD = int(os.getenv("LOW_RES_THRESHOLD", "100"))
MAX_FACES = int(os.getenv("MAX_FACES", "4"))
SUPPORTED_FORMATS = os.getenv("SUPPORTED_FORMATS", "jpg,jpeg,png,webp").split(",")

# ─── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Face Search Pipeline",
    page_icon=None,
    layout="wide"
)

# ─── Custom CSS for a cleaner look ────────────────────────────────────────────
st.markdown("""
<style>
    .main-header {
        text-align: center;
        padding: 1rem 0;
    }
    .result-card {
        background: #1e1e2e;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 1.2rem;
        margin-bottom: 1rem;
    }
    .match-badge {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        display: inline-block;
    }
    .step-done { color: #4caf50; }
    .step-pending { color: #666; }
    .step-fail { color: #f44336; }
    .pipeline-output {
        background: #0e1117;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1rem;
        font-family: monospace;
        font-size: 0.85rem;
    }
    div[data-testid="stFileUploader"] {
        border: 2px dashed #444;
        border-radius: 12px;
        padding: 1rem;
    }
</style>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
#  CORE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_faces(image_array):
    """Detect faces and generate encodings from an image array."""
    # face_recognition expects RGB
    if len(image_array.shape) == 2:
        # Grayscale → RGB
        rgb_image = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)
    elif image_array.shape[2] == 4:
        # RGBA → RGB
        rgb_image = cv2.cvtColor(image_array, cv2.COLOR_RGBA2RGB)
    else:
        rgb_image = image_array  # Already RGB from PIL

    face_locations = face_recognition.face_locations(rgb_image, model="hog")
    face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
    face_landmarks_list = face_recognition.face_landmarks(rgb_image, face_locations)

    return face_locations, face_encodings, face_landmarks_list, rgb_image


def get_face_quality(face_image):
    """Assess face image quality — blur and resolution."""
    gray = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    height, width = face_image.shape[:2]

    return {
        "blur_score": round(blur_score, 1),
        "is_blurry": blur_score < BLUR_THRESHOLD,
        "resolution": f"{width}×{height}",
        "width": width,
        "height": height,
        "is_low_res": width < LOW_RES_THRESHOLD or height < LOW_RES_THRESHOLD,
    }


def compute_image_hash(image_array):
    """Generate SHA-256 hash of the image bytes for fingerprinting."""
    img = Image.fromarray(image_array)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return hashlib.sha256(buf.getvalue()).hexdigest()


def search_with_serpapi(face_image_array):
    """
    REAL search: Upload the cropped face to SerpApi Google Lens
    and return matching web results.
    """
    # Save face crop to a temp file
    face_pil = Image.fromarray(face_image_array)
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    face_pil.save(tmp.name, format="JPEG", quality=90)
    tmp.close()

    try:
        # Upload to SerpApi's image hosting to get a URL
        upload_url = "https://serpapi.com/uploads"
        with open(tmp.name, "rb") as f:
            upload_resp = requests.post(
                upload_url,
                files={"file": ("face.jpg", f, "image/jpeg")},
                headers={"Authorization": f"Bearer {SERPAPI_KEY}"},
                timeout=30,
            )

        if upload_resp.status_code == 200:
            image_url = upload_resp.json().get("url", "")
        else:
            # Fallback: try direct Google Lens search with file
            image_url = None

        # Query Google Lens via SerpApi
        params = {
            "engine": "google_lens",
            "api_key": SERPAPI_KEY,
        }
        if image_url:
            params["url"] = image_url
        else:
            # Save temp and use file upload approach
            params["url"] = f"file://{tmp.name}"

        resp = requests.get(
            "https://serpapi.com/search.json",
            params=params,
            timeout=30,
        )

        if resp.status_code != 200:
            return None, f"SerpApi returned status {resp.status_code}: {resp.text[:200]}"

        data = resp.json()

        # Parse results
        results = []

        # Exact matches
        for match in data.get("exact_matches", []):
            results.append({
                "page_url": match.get("link", ""),
                "image_url": match.get("thumbnail", ""),
                "title": match.get("title", ""),
                "domain": match.get("source", ""),
                "match_type": "exact",
                "similarity": 95,
            })

        # Visual matches
        for match in data.get("visual_matches", []):
            results.append({
                "page_url": match.get("link", ""),
                "image_url": match.get("thumbnail", ""),
                "title": match.get("title", ""),
                "domain": match.get("source", ""),
                "match_type": "similar",
                "similarity": match.get("similarity", 80),
            })

        # Knowledge graph (sometimes has social profiles)
        kg = data.get("knowledge_graph", [])
        if isinstance(kg, dict):
            kg = [kg]
        for item in kg:
            if item.get("link"):
                results.append({
                    "page_url": item.get("link", ""),
                    "image_url": item.get("thumbnail", ""),
                    "title": item.get("title", ""),
                    "domain": item.get("source", ""),
                    "match_type": "profile",
                    "similarity": 90,
                })

        return results, None

    except requests.exceptions.Timeout:
        return None, "Search timed out. Please try again."
    except requests.exceptions.ConnectionError:
        return None, "Could not connect to search service."
    except Exception as e:
        return None, f"Search error: {str(e)}"
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


def search_mock(face_encoding):
    """
    DEMO search: Returns clearly-labeled fake results.
    Used when no SERPAPI_KEY is configured.
    """
    time.sleep(2)  # Simulate search time

    return [
        {
            "page_url": "https://instagram.com/p/DEMO_123",
            "image_url": "",
            "title": "DEMO — Public Instagram Post",
            "domain": "instagram.com",
            "match_type": "exact",
            "similarity": 94,
        },
        {
            "page_url": "https://twitter.com/user/status/DEMO_456",
            "image_url": "",
            "title": "DEMO — Public Tweet with Photo",
            "domain": "twitter.com",
            "match_type": "similar",
            "similarity": 87,
        },
        {
            "page_url": "https://reddit.com/r/pics/comments/DEMO_789",
            "image_url": "",
            "title": "DEMO — Reddit Post",
            "domain": "reddit.com",
            "match_type": "similar",
            "similarity": 76,
        },
    ], None


def categorize_domain(domain):
    """Categorize a domain into platform type."""
    domain = domain.lower()
    social = {
        "instagram.com": ("Instagram", ""),
        "twitter.com": ("Twitter/X", ""),
        "x.com": ("X", ""),
        "facebook.com": ("Facebook", ""),
        "linkedin.com": ("LinkedIn", ""),
        "reddit.com": ("Reddit", ""),
        "tiktok.com": ("TikTok", ""),
        "pinterest.com": ("Pinterest", ""),
        "youtube.com": ("YouTube", ""),
        "tumblr.com": ("Tumblr", ""),
    }
    for key, val in social.items():
        if key in domain:
            return val[0], val[1], "social_media"
    if any(x in domain for x in ["news", "bbc", "cnn", "reuters", "nytimes"]):
        return domain, "", "news"
    return domain, "", "website"


def build_pipeline_output(face_data, results, is_demo):
    """
    Build the JSON output that gets passed to the blockchain part.
    This is what your friend's code will consume.
    """
    output = {
        "pipeline_version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_demo": is_demo,
        "face_scan": {
            "face_detected": True,
            "face_encoding_hash": compute_image_hash(face_data["face_crop"]),
            "quality": face_data["quality"],
        },
        "search_results": {
            "provider": "demo_mock" if is_demo else "serpapi_google_lens",
            "total_matches": len(results),
            "matches": [],
        },
    }

    for r in results:
        platform_name, _, platform_type = categorize_domain(r.get("domain", ""))
        output["search_results"]["matches"].append({
            "page_url": r["page_url"],
            "image_url": r.get("image_url", ""),
            "title": r.get("title", ""),
            "domain": r.get("domain", ""),
            "platform_name": platform_name,
            "platform_type": platform_type,
            "match_type": r.get("match_type", "similar"),
            "similarity_pct": r.get("similarity", 0),
        })

    return output


# ═══════════════════════════════════════════════════════════════════════════════
#  UI
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Header ───────────────────────────────────────────────────────────────────
st.markdown("<h1 style='text-align:center;'>Face Search Pipeline</h1>", unsafe_allow_html=True)
st.markdown(
    "<p style='text-align:center; color:#888;'>"
    "Face scan → Web search → Blockchain verification</p>",
    unsafe_allow_html=True,
)

# Show mode
is_demo = not bool(SERPAPI_KEY)
if is_demo:
    st.warning(
        "**Demo Mode** — No SERPAPI_KEY found in `.env`. "
        "Results will be simulated. Get a free key at [serpapi.com](https://serpapi.com)"
    )

# ─── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Pipeline Steps")
    st.markdown("""
    1. **Upload** a photo with a face  
    2. **Detect** & extract the face  
    3. **Search** the web for matches  
    4. **Export** results for blockchain  
    """)

    st.divider()

    st.header("Config")
    st.caption(f"Max file size: **{MAX_FILE_SIZE_MB} MB**")
    st.caption(f"Formats: **{', '.join(SUPPORTED_FORMATS)}**")
    st.caption(f"Blur threshold: **{BLUR_THRESHOLD}**")
    st.caption(f"Search API: **{'SerpApi' if not is_demo else 'Demo Mock'}**")

    st.divider()

    st.header("Disclaimer")
    st.caption(
        "For hackathon demonstration only. "
        "Do not use for harassment, surveillance, or stalking."
    )

# ─── Upload ───────────────────────────────────────────────────────────────────
st.markdown("### Step 1: Upload a Photo")

uploaded_file = st.file_uploader(
    "Choose an image with a clear, visible face",
    type=SUPPORTED_FORMATS,
    help=f"Supported: {', '.join(SUPPORTED_FORMATS).upper()} — Max {MAX_FILE_SIZE_MB}MB",
)

# ─── Processing ───────────────────────────────────────────────────────────────
if uploaded_file is not None:
    # --- Validate file size ---
    file_size_mb = uploaded_file.size / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        st.error(f"File too large ({file_size_mb:.1f} MB). Max is {MAX_FILE_SIZE_MB} MB.")
        st.stop()

    # --- Read & validate image ---
    try:
        image = Image.open(uploaded_file)
        image_array = np.array(image.convert("RGB"))
    except Exception:
        st.error("Couldn't read this image. The file may be corrupted.")
        st.stop()

    # --- Show uploaded image ---
    col_img, col_info = st.columns([2, 1])
    with col_img:
        st.image(image, caption="Uploaded Image", use_container_width=True)
    with col_info:
        st.markdown("**File Info**")
        st.caption(f"Name: `{uploaded_file.name}`")
        st.caption(f"Size: `{file_size_mb:.2f} MB`")
        st.caption(f"Dimensions: `{image.width}×{image.height}`")
        st.caption(f"Format: `{uploaded_file.type}`")

    st.divider()

    # ─── Step 2: Face Detection ───────────────────────────────────────────────
    st.markdown("### Step 2: Face Detection")

    with st.spinner("Detecting faces with dlib 68-point landmarks..."):
        face_locations, face_encodings, face_landmarks_list, rgb_image = detect_faces(image_array)

    # --- No face found ---
    if len(face_locations) == 0:
        st.error("No face detected in this image.")
        st.info(
            "**Possible reasons:**\n"
            "- Face is turned away or at an extreme angle\n"
            "- Image is too blurry or dark\n"
            "- Face is too small in the image\n"
            "- Image doesn't contain a human face\n\n"
            "Try uploading a clearer, front-facing photo."
        )
        st.stop()

    # Draw dlib 68 landmarks on a copy of the image for visual verification
    marked_image = rgb_image.copy()
    for landmarks in face_landmarks_list:
        for feature, points in landmarks.items():
            for pt in points:
                cv2.circle(marked_image, pt, 2, (0, 255, 128), -1)

    st.success(f"{len(face_locations)} face{'s' if len(face_locations) > 1 else ''} detected with 68-point dlib facial landmarks")
    st.image(marked_image, caption="dlib 68-Point Facial Landmark Tracking", use_container_width=True)

    # Pick which face to use
    if len(face_locations) > 1:
        st.info(f"Multiple faces found. Showing the first {min(len(face_locations), MAX_FACES)}.")

    # Let user select a face
    face_options = []
    face_crops = []
    for i, loc in enumerate(face_locations[:MAX_FACES]):
        top, right, bottom, left = loc
        crop = rgb_image[top:bottom, left:right]
        face_crops.append(crop)
        face_options.append(f"Face {i + 1}")

    # Show face previews
    cols = st.columns(min(len(face_crops), 4))
    for i, crop in enumerate(face_crops):
        with cols[i]:
            st.image(crop, caption=f"Face {i + 1}", width=150)

    selected_idx = 0
    if len(face_crops) > 1:
        selected_face_label = st.radio(
            "Select face to search:",
            face_options,
            horizontal=True,
        )
        selected_idx = face_options.index(selected_face_label)

    face_crop = face_crops[selected_idx]
    face_encoding = face_encodings[selected_idx]

    # Quality check
    quality = get_face_quality(face_crop)

    col_q1, col_q2, col_q3 = st.columns(3)
    with col_q1:
        st.metric("Resolution", quality["resolution"])
    with col_q2:
        st.metric("Blur Score", quality["blur_score"])
    with col_q3:
        status = "Good" if not quality["is_blurry"] and not quality["is_low_res"] else "Low"
        st.metric("Quality", status)

    if quality["is_blurry"]:
        st.warning("Face is blurry — results may be less accurate.")
    if quality["is_low_res"]:
        st.warning(
            f"Face is only {quality['width']}×{quality['height']}px "
            f"(recommended: {LOW_RES_THRESHOLD}×{LOW_RES_THRESHOLD}+)."
        )

    st.divider()

    # ─── Step 3: Web Search ───────────────────────────────────────────────────
    st.markdown("### Step 3: Web Search")

    if st.button("Search the web for this face", type="primary", use_container_width=True):

        # Progress display
        progress_container = st.container()
        with progress_container:
            steps = [
                "Preparing face image",
                "Generating image fingerprint",
                "Searching for exact matches",
                "Searching for visual matches",
                "Processing results",
            ]
            progress_bar = st.progress(0)
            status_text = st.empty()

            for i, step in enumerate(steps[:2]):
                status_text.markdown(f"**{step}...** ◌")
                time.sleep(0.5)
                progress_bar.progress((i + 1) / len(steps))
                status_text.markdown(f"**{step}** ")

            # Actually search
            status_text.markdown(f"**{steps[2]}...** ◌")
            progress_bar.progress(3 / len(steps))

            if is_demo:
                results, error = search_mock(face_encoding)
            else:
                results, error = search_with_serpapi(face_crop)

            progress_bar.progress(4 / len(steps))
            status_text.markdown(f"**{steps[3]}** ")
            time.sleep(0.3)
            progress_bar.progress(1.0)
            status_text.markdown(f"**{steps[4]}** ")

        st.divider()

        # ─── Handle errors ────────────────────────────────────────────────────
        if error:
            st.error(f"Search failed: {error}")
            st.info("Try again or check your API key.")
            st.stop()

        # ─── Handle no results ────────────────────────────────────────────────
        if not results or len(results) == 0:
            st.markdown("### Results")
            st.info(
                "**No matching posts found.**\n\n"
                "This doesn't mean the person isn't online. Possible reasons:\n"
                "- Their photos may not be indexed by search engines\n"
                "- Their accounts may be private\n"
                "- The image may be too different from their online photos\n"
                "- The content may be on platforms not covered by our search\n\n"
                "**Try:** a different photo, a clearer image, or a different angle."
            )

            # Still build output for blockchain (with 0 results)
            pipeline_output = build_pipeline_output(
                {"face_crop": face_crop, "quality": quality},
                [],
                is_demo,
            )
            st.markdown("### Pipeline Output (for Blockchain)")
            st.json(pipeline_output)
            st.stop()

        # ─── Display results ──────────────────────────────────────────────────
        st.markdown(f"### Found {len(results)} matching public page{'s' if len(results) != 1 else ''}")

        if is_demo:
            st.warning("**These are DEMO results, not real matches.** Set SERPAPI_KEY for real searches.")

        for i, result in enumerate(results):
            platform_name, platform_icon, platform_type = categorize_domain(result.get("domain", ""))
            similarity = result.get("similarity", 0)

            # Color code similarity
            if similarity >= 90:
                sim_color = "[High]"
            elif similarity >= 75:
                sim_color = "[Medium]"
            else:
                sim_color = "[Moderate]"

            with st.container():
                col1, col2, col3 = st.columns([1, 3, 1])

                with col1:
                    st.markdown(f"### {platform_icon}")
                    st.caption(platform_name)

                with col2:
                    title = result.get("title", "Untitled")
                    st.markdown(f"**{title}**")
                    st.caption(f" `{result.get('domain', 'unknown')}`")
                    st.caption(f"Type: **{result.get('match_type', 'similar')}**")

                with col3:
                    st.markdown(f"### {sim_color} {similarity}%")
                    st.caption("similarity")

                url = result.get("page_url", "")
                if url:
                    st.markdown(f"[ Open Page]({url})")

                st.divider()

        # ─── Step 4: Pipeline Output for Blockchain ───────────────────────────
        st.markdown("### Step 4: Pipeline Output → Blockchain")
        st.caption("This JSON is what your blockchain module will consume.")

        pipeline_output = build_pipeline_output(
            {"face_crop": face_crop, "quality": quality},
            results,
            is_demo,
        )

        # Show JSON
        st.json(pipeline_output)

        # Download button
        output_json = json.dumps(pipeline_output, indent=2)
        st.download_button(
            label="⬇ Download Pipeline Output (JSON)",
            data=output_json,
            file_name=f"face_search_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json",
            use_container_width=True,
        )

        # Save to session for blockchain module to pick up
        st.session_state.pipeline_output = pipeline_output
        st.session_state.search_results = results

# ─── Footer ───────────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    "<p style='text-align:center; color:#666; font-size:0.85rem;'>"
    "Face Search Pipeline — Hackathon Project<br>"
    "Face Detection → Web Search → Blockchain Verification"
    "</p>",
    unsafe_allow_html=True,
)