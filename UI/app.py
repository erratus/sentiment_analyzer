from flask import Flask, request, render_template, jsonify, redirect, url_for, flash
import pandas as pd
import numpy as np
import torch
from transformers import AutoTokenizer
import pickle
import os
import json
from werkzeug.utils import secure_filename
import plotly.graph_objs as go
import plotly.utils
from collections import Counter
import re
from datetime import datetime

from model import SentimentPredictor
from data_preprocessing import clean_text

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this in production
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'csv'}
MODEL_DIR = './models'

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Global variables for model
predictor = None
model_loaded = False

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_model():
    """Load the trained sentiment analysis model."""
    global predictor, model_loaded
    
    try:
        model_path = os.path.join(MODEL_DIR, 'bert_sentiment_classifier.pt')
        label_encoder_path = os.path.join(MODEL_DIR, 'label_encoder.pkl')
        tokenizer_path = os.path.join(MODEL_DIR, 'tokenizer')
        
        if not all(os.path.exists(path) for path in [model_path, label_encoder_path, tokenizer_path]):
            print("Model files not found. Please train the model first.")
            return False
        
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
        
        # Initialize predictor
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        predictor = SentimentPredictor(model_path, label_encoder_path, tokenizer, device)
        
        model_loaded = True
        print("Model loaded successfully!")
        return True
        
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

def create_sentiment_visualization(results):
    """Create plotly visualizations for sentiment analysis results."""
    
    # Extract data
    sentiments = [r['predicted_sentiment'] for r in results]
    confidences = [r['confidence'] for r in results]
    
    # Sentiment distribution pie chart
    sentiment_counts = Counter(sentiments)
    
    pie_chart = go.Figure(data=[go.Pie(
        labels=