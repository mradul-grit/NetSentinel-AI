"""
Machine learning model for network anomaly detection.
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pickle

class AnomalyDetectionModel:
    """ML model for detecting network anomalies."""
    
    def __init__(self, contamination=0.1):
        self.model = IsolationForest(contamination=contamination, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def preprocess_data(self, data):
        """Convert traffic data to feature vectors."""
        features = []
        for packet in data:
            feature_vector = [
                packet.get('source_port', 0),
                packet.get('destination_port', 0),
                packet.get('packet_size', 0),
                packet.get('duration', 0),
                1 if packet.get('protocol') == 'TCP' else 0,
                1 if packet.get('protocol') == 'UDP' else 0,
            ]
            features.append(feature_vector)
        return np.array(features)
    
    def train(self, training_data):
        """Train the anomaly detection model."""
        X = self.preprocess_data(training_data)
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self.is_trained = True
        return self
    
    def predict(self, data):
        """Predict anomalies in network traffic."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        X = self.preprocess_data(data)
        X_scaled = self.scaler.transform(X)
        predictions = self.model.predict(X_scaled)
        scores = self.model.score_samples(X_scaled)
        
        return {
            'predictions': predictions,
            'anomaly_scores': scores,
            'is_anomaly': predictions == -1
        }
    
    def save_model(self, filepath):
        """Save trained model to disk."""
        with open(filepath, 'wb') as f:
            pickle.dump({'model': self.model, 'scaler': self.scaler}, f)
    
    def load_model(self, filepath):
        """Load trained model from disk."""
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
            self.model = data['model']
            self.scaler = data['scaler']
            self.is_trained = True
