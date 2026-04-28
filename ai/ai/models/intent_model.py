import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression


class IntentClassifier:
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.df = None
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2))
        self.model = LogisticRegression(max_iter=1000)
        self.is_trained = False

    def normalize_text(self, text: str) -> str:
        return str(text).lower().replace("_", " ").strip()

    def load_data(self):
        self.df = pd.read_csv(self.data_path)

        required_cols = {"text", "intent"}
        missing_cols = required_cols - set(self.df.columns)
        if missing_cols:
            raise ValueError(f"Thieu cot trong intent_data.csv: {missing_cols}")

        self.df["text"] = self.df["text"].astype(str).apply(self.normalize_text)
        self.df["intent"] = self.df["intent"].astype(str).apply(self.normalize_text)

    def train(self):
        if self.df is None:
            raise ValueError("Chua load data")

        X = self.vectorizer.fit_transform(self.df["text"])
        y = self.df["intent"]

        self.model.fit(X, y)
        self.is_trained = True

    def predict(self, text: str) -> str:
        if not self.is_trained:
            raise ValueError("Chua train model")

        text = self.normalize_text(text)
        X = self.vectorizer.transform([text])
        pred = self.model.predict(X)[0]
        return str(pred)

    def predict_with_score(self, text: str):
        if not self.is_trained:
            raise ValueError("Chua train model")

        text = self.normalize_text(text)
        X = self.vectorizer.transform([text])

        pred = self.model.predict(X)[0]
        probs = self.model.predict_proba(X)[0]
        classes = self.model.classes_

        score_map = {cls: float(prob) for cls, prob in zip(classes, probs)}
        best_score = float(max(probs))

        return {
            "intent": str(pred),
            "score": best_score,
            "probs": score_map
        }