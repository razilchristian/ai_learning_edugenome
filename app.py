from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()
import requests
import os


app = Flask(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyAgZ33W_56aFT7Prm-qvgN6Q_G8XO4IyKs")

@app.route("/api/chat", methods=["POST"])
def chat_proxy():
    data = request.get_json()

    # Convert messages to Gemini format
    system_prompt = data.get("system", "")
    messages = data.get("messages", [])

    # Build Gemini contents array
    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })

    gemini_payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": 1000,
            "temperature": 0.7
        }
    }

    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json=gemini_payload
    )

    gemini_data = response.json()

    # Convert Gemini response to Anthropic-like format so frontend works unchanged
    try:
        text = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"content": [{"type": "text", "text": text}]}), 200
    except (KeyError, IndexError):
        return jsonify({"error": {"message": str(gemini_data)}}), 500


@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/student')
def student():
    return render_template('student_dashboard.html')

@app.route('/learning-path')
def learning_path():
    return render_template('learning_path.html')

@app.route('/learning-dna')
def learning_dna():
    return render_template('learning_dna.html')

@app.route('/ai-tutor')
def ai_tutor():
    return render_template('ai_tutor.html')

@app.route('/gamification')
def gamification():
    return render_template('gamification.html')
@app.route('/settings')
def settings():
    return render_template('settings.html')
@app.route('/teacher')
def teacher():
    return render_template('teacher_dashboard.html')

@app.route('/failure-prediction')
def failure_prediction():
    return render_template('failure_prediction.html', result=None, score=None, inputs=None)

@app.route('/predict-risk', methods=['POST'])
def predict_risk():
    attendance = float(request.form['attendance'])
    assignment = float(request.form['assignment'])
    quiz = float(request.form['quiz'])

    score = (attendance * 0.4 + assignment * 0.3 + quiz * 0.3)

    if score < 50:
        result = "High Risk"
    elif score < 70:
        result = "Medium Risk"
    else:
        result = "Low Risk"

    inputs = {
        'attendance': attendance,
        'assignment': assignment,
        'quiz': quiz
    }

    return render_template('failure_prediction.html', result=result, score=round(score, 1), inputs=inputs)

@app.route('/mycourseteacher')
def mycourseteacher():
    return render_template('mycourseteacher.html')

@app.route('/mystudents')
def mystudents():
    return render_template('mystudents.html')

@app.route('/mycourses')
def mycourses():
    return render_template('mycourses.html')

@app.route('/analytics')
def analytics():
    return render_template('analytics.html')
    

@app.route('/admin')
def admin():
    return render_template('admin_dashboard.html')

if __name__ == '__main__':
    app.run(debug=True)