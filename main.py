import json
import os
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
PLAYLIST_FILE = 'playlist.json'


def load_playlist():
    if os.path.exists(PLAYLIST_FILE):
        try:
            with open(PLAYLIST_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_playlist(playlist_data):
    with open(PLAYLIST_FILE, 'w', encoding='utf-8') as f:
        json.dump(playlist_data, f, indent=4)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/playlist', methods=['GET', 'POST', 'DELETE'])
def handle_playlist():
    if request.method == 'GET':
        return jsonify(load_playlist())

    elif request.method == 'POST':
        item = request.json
        if not item or 'id' not in item:
            return jsonify({'error': 'Invalid track payload'}), 400

        playlist = load_playlist()
        # Prevent duplicates
        if not any(x['id'] == item['id'] for x in playlist):
            playlist.append({
                'id': item['id'],
                'title': item.get('title', 'Unknown Track'),
                'author': item.get('author', 'YouTube Creator'),
                'thumbnail': item.get(
                    'thumbnail',
                    f"https://img.youtube.com/vi/{item['id']}/hqdefault.jpg"
                )
            })
            save_playlist(playlist)
        return jsonify({'status': 'success', 'playlist': playlist})

    elif request.method == 'DELETE':
        video_id = request.args.get('id')
        if not video_id:
            return jsonify({'error': 'Missing track ID'}), 400

        playlist = load_playlist()
        playlist = [x for x in playlist if x['id'] != video_id]
        save_playlist(playlist)
        return jsonify({'status': 'success', 'playlist': playlist})


if __name__ == '__main__':
    # Host on 0.0.0.0 to enable local device access via Pydroid 3 or browser
    app.run(host='0.0.0.0', port=5000, debug=True)Enter
