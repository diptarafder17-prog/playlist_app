import json
import os
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
PLAYLIST_FILE = 'playlist.json'

# In-memory dictionary for O(1) lookups and fast GET responses
PLAYLIST_STORE = {}


def load_playlist_from_disk():
    """Loads saved playlist into in-memory dictionary on startup."""
    global PLAYLIST_STORE
    if os.path.exists(PLAYLIST_FILE):
        try:
            with open(PLAYLIST_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    PLAYLIST_STORE = {
                        item['id']: item for item in data if 'id' in item
                    }
        except Exception as e:
            print(f"Error reading {PLAYLIST_FILE}: {e}")
            PLAYLIST_STORE = {}


def save_playlist_to_disk():
    """Persists in-memory playlist dictionary to JSON atomically."""
    try:
        temp_file = f"{PLAYLIST_FILE}.tmp"
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(list(PLAYLIST_STORE.values()), f, indent=4)
        os.replace(temp_file, PLAYLIST_FILE)
    except Exception as e:
        print(f"Error saving {PLAYLIST_FILE}: {e}")


# Initialize RAM cache once when application starts
load_playlist_from_disk()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/playlist', methods=['GET', 'POST', 'DELETE'])
def handle_playlist():
    if request.method == 'GET':
        return jsonify(list(PLAYLIST_STORE.values()))

    elif request.method == 'POST':
        item = request.get_json(silent=True)
        if not item or 'id' not in item:
            return jsonify({'error': 'Invalid track payload'}), 400

        track_id = str(item['id'])

        if track_id not in PLAYLIST_STORE:
            PLAYLIST_STORE[track_id] = {
                'id': track_id,
                'title': item.get('title', 'Unknown Track'),
                'author': item.get('author', 'YouTube Creator'),
                'thumbnail': item.get(
                    'thumbnail',
                    f"https://img.youtube.com/vi/{track_id}/hqdefault.jpg"
                )
            }
            save_playlist_to_disk()

        return jsonify({
            'status': 'success',
            'playlist': list(PLAYLIST_STORE.values())
        })

    elif request.method == 'DELETE':
        track_id = request.args.get('id')
        if not track_id:
            return jsonify({'error': 'Missing track ID'}), 400

        if track_id in PLAYLIST_STORE:
            del PLAYLIST_STORE[track_id]
            save_playlist_to_disk()

        return jsonify({
            'status': 'success',
            'playlist': list(PLAYLIST_STORE.values())
        })


@app.route('/api/tracks/<track_id>', methods=['GET'])
def get_track_details(track_id):
    """Specific track metadata endpoint (used by static/app.js)"""
    track = PLAYLIST_STORE.get(track_id, {
        'id': track_id,
        'title': 'YouTube Track',
        'author': 'YouTube Creator',
        'thumbnail': f"https://img.youtube.com/vi/{track_id}/hqdefault.jpg"
    })
    return jsonify(track)


if __name__ == '__main__':
    # Host on 0.0.0.0 to enable local device access via Pydroid 3 or browser
    app.run(host='0.0.0.0', port=5000, debug=True)
