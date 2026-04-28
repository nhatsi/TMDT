import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class ChatbotModel:
    def __init__(self, faq_path: str):
        self.faq_path = faq_path
        self.faq_df = None
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2))
        self.question_vectors = None

    def load_data(self):
        self.faq_df = pd.read_csv(self.faq_path)

    def train(self):
        if self.faq_df is None:
            raise ValueError("Chua load data")

        questions = self.faq_df["question"].astype(str).tolist()
        self.question_vectors = self.vectorizer.fit_transform(questions)

    def ask(self, user_question: str, threshold: float = 0.2):
        if self.question_vectors is None:
            raise ValueError("Chua train model")

        user_vec = self.vectorizer.transform([user_question])
        scores = cosine_similarity(user_vec, self.question_vectors)[0]

        best_idx = scores.argmax()
        best_score = float(scores[best_idx])

        if best_score < threshold:
            return {
                "answer": "Xin loi, toi chua tim thay cau tra loi phu hop.",
                "score": best_score
            }

        return {
            "answer": self.faq_df.iloc[best_idx]["answer"],
            "score": best_score
        }