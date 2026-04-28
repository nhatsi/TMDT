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

        if "description" not in self.products_df.columns:
            self.products_df["description"] = ""

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

    def search_with_filter(
        self,
        query: str,
        category=None,
        color=None,
        gender=None,
        max_price=None,
        top_n=5
    ):
        if self.products_df is None or self.product_vectors is None:
            raise ValueError("Chua train model")

        result = self.products_df.copy()

        if max_price:
            result = result[result["price"] <= max_price]

        if len(result) == 0:
            return []

        query = self.normalize_text(query)

        query_vec = self.vectorizer.transform([query])
        vectors = self.vectorizer.transform(result["text"])

        scores = cosine_similarity(query_vec, vectors)[0]

        result = result.copy()
        result["score"] = scores

        # boost category
        if category:
             result.loc[
        result["category"].astype(str).str.contains(category, case=False, na=False),
        "score"
                ] += 0.35

        # boost color nếu products.csv có cột color
        if color and "color" in result.columns:
            result.loc[
                result["color"].astype(str).str.contains(color, case=False, na=False),
                "score"
            ] += 0.3

        # boost gender nếu products.csv có cột gender
        if gender and "gender" in result.columns:
            result.loc[
                result["gender"].astype(str).str.contains(gender, case=False, na=False),
                "score"
            ] += 0.15

        result = result[result["score"] > 0]
        result = result.sort_values("score", ascending=False).head(top_n)

        return result[
            ["product_id", "name", "category", "price", "score"]
        ].to_dict(orient="records")