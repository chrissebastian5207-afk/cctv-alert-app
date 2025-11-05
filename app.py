import os
import json
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS

# ---------------- CONFIG ----------------
app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'replace_this_with_a_strong_secret'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# ---------------- DATA ----------------
DATA_DIR = 'data'
ALERT_FILE = os.path.join(DATA_DIR, 'alerts.json')

os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(ALERT_FILE):
    with open(ALERT_FILE, 'w') as f:
        json.dump([], f, indent=2)

def load_alerts():
    try:
        with open(ALERT_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_alerts(alerts):
    with open(ALERT_FILE, 'w') as f:
        json.dump(alerts, f, indent=2)

# ---------------- ROUTES ----------------
@app.route('/', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        user_type = request.form.get('user_type')
        username = request.form.get('username')
        password = request.form.get('password')

        if user_type == 'admin' and username == 'admin' and password == 'admin123':
            session['user'] = 'admin'
            return redirect(url_for('admin_dashboard'))
        elif user_type == 'user' and username == 'user' and password == 'user123':
            session['user'] = 'user'
            return redirect(url_for('user_dashboard'))
        else:
            error = "Invalid credentials. Try admin/admin123 or user/user123."
    return render_template('login.html', error=error)

@app.route('/admin')
def admin_dashboard():
    if session.get('user') != 'admin':
        return redirect(url_for('login'))
    alerts = load_alerts()
    return render_template('admin_dashboard.html', alerts=reversed(alerts))

@app.route('/user')
def user_dashboard():
    if session.get('user') != 'user':
        return redirect(url_for('login'))
    alerts = load_alerts()
    return render_template('user_dashboard.html', alerts=reversed(alerts))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/send_alert', methods=['POST'])
def send_alert():
    if session.get('user') != 'admin':
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403

    data = request.get_json()
    title = data.get('title', 'Alert')
    message = data.get('message', '')
    priority = data.get('priority', 'Medium')

    new_alert = {
        'id': len(load_alerts()) + 1,
        'title': title,
        'message': message,
        'priority': priority,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }

    alerts = load_alerts()
    alerts.append(new_alert)
    save_alerts(alerts)

    socketio.emit('new_alert', new_alert)
    return jsonify({'status': 'ok', 'alert': new_alert})

@app.route('/ping')
def ping():
    return jsonify({'pong': True, 'time': datetime.utcnow().isoformat()})

# ---------------- SOCKET EVENTS ----------------
@socketio.on('connect')
def on_connect():
    print("Client connected")

@socketio.on('disconnect')
def on_disconnect():
    print("Client disconnected")

# ---------------- MAIN ----------------
if __name__ == "__main__":
    socketio.run(app, debug=True)
