import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class ProductSearchModel:
    def __init__(self, products_path: str):
        self.products_path = products_path
        self.products_df = None
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2))
        self.product_vectors = None

    def normalize_text(self, text: str) -> str:
        return str(text).lower().replace("_", " ").strip()

    def load_data(self):
        self.products_df = pd.read_csv(self.products_path)

        required_cols = {"product_id", "name", "category", "price"}
        missing_cols = required_cols - set(self.products_df.columns)
        if missing_cols:
            raise ValueError(f"Thieu cot trong products.csv: {missing_cols}")

        self.products_df["text"] = (
           self.products_df["name"].astype(str).apply(self.normalize_text) + " " +
    self.products_df["category"].astype(str).apply(self.normalize_text) + " " +
    self.products_df["description"].astype(str).apply(self.normalize_text)
)
        

    def train(self):
        if self.products_df is None:
            raise ValueError("Chua load data")

        self.product_vectors = self.vectorizer.fit_transform(self.products_df["text"])

    def search(self, query: str, top_n: int = 5):
        if self.product_vectors is None:
            raise ValueError("Chua train model")

        query = self.normalize_text(query)
        if not query:
            return []

        query_vec = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vec, self.product_vectors)[0]

        result = self.products_df.copy()
        result["score"] = scores

        result = result[result["score"] > 0]
        result = result.sort_values("score", ascending=False).head(top_n)

        return result[["product_id", "name", "category", "price", "score"]].to_dict(orient="records")