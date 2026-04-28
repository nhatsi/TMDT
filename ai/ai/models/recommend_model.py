import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer


class RecommendationModel:
    def __init__(self, history_path: str, products_path: str):
        self.history_path = history_path
        self.products_path = products_path

        self.history_df = None
        self.products_df = None

        self.user_item_matrix = None
        self.user_similarity = None

        self.product_texts = None
        self.product_vectors = None
        self.product_similarity = None
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2))

        self.popularity_scores = None

    def normalize_text(self, text: str) -> str:
        return str(text).lower().replace("_", " ").strip()

    def load_data(self):
        self.history_df = pd.read_csv(self.history_path)
        self.products_df = pd.read_csv(self.products_path)

        required_cols = {"product_id", "name", "category", "price"}
        missing_cols = required_cols - set(self.products_df.columns)
        if missing_cols:
            raise ValueError(f"Thieu cot trong products.csv: {missing_cols}")

        if "description" not in self.products_df.columns:
            self.products_df["description"] = ""

    def preprocess(self):
        if self.history_df is None or self.products_df is None:
            raise ValueError("Chua load data")

        score_map = {
            "view": 1,
            "add_cart": 3,
            "buy": 5
        }

        df = self.history_df.copy()
        df["score"] = df["action"].map(score_map).fillna(0)

        self.user_item_matrix = df.pivot_table(
            index="user_id",
            columns="product_id",
            values="score",
            aggfunc="sum",
            fill_value=0
        )

        self.products_df["text"] = (
            self.products_df["name"].astype(str).apply(self.normalize_text) + " " +
            self.products_df["category"].astype(str).apply(self.normalize_text) + " " +
            self.products_df["description"].astype(str).apply(self.normalize_text)
        )

        pop_df = df.groupby("product_id")["score"].sum().reset_index()
        max_score = pop_df["score"].max() if len(pop_df) > 0 else 1
        if max_score == 0:
            max_score = 1
        pop_df["pop_score"] = pop_df["score"] / max_score
        self.popularity_scores = dict(zip(pop_df["product_id"], pop_df["pop_score"]))

    def train(self):
        if self.user_item_matrix is None:
            raise ValueError("Chua preprocess data")

        self.user_similarity = cosine_similarity(self.user_item_matrix)
        self.user_similarity = pd.DataFrame(
            self.user_similarity,
            index=self.user_item_matrix.index,
            columns=self.user_item_matrix.index
        )

        self.product_vectors = self.vectorizer.fit_transform(self.products_df["text"])
        sim_matrix = cosine_similarity(self.product_vectors)
        self.product_similarity = pd.DataFrame(
            sim_matrix,
            index=self.products_df["product_id"],
            columns=self.products_df["product_id"]
        )

    def _collaborative_scores(self, user_id: int):
        if user_id not in self.user_item_matrix.index:
            return {}

        similar_users = self.user_similarity[user_id].sort_values(ascending=False)
        similar_users = similar_users.drop(user_id, errors="ignore")

        user_seen = set(
            self.user_item_matrix.loc[user_id][self.user_item_matrix.loc[user_id] > 0].index.tolist()
        )

        candidate_scores = {}

        for sim_user_id, sim_score in similar_users.items():
            sim_user_items = self.user_item_matrix.loc[sim_user_id]

            for product_id, value in sim_user_items.items():
                if value > 0 and product_id not in user_seen:
                    candidate_scores[product_id] = candidate_scores.get(product_id, 0) + sim_score * value

        if not candidate_scores:
            return {}

        max_score = max(candidate_scores.values())
        if max_score == 0:
            return {}

        return {pid: score / max_score for pid, score in candidate_scores.items() if score > 0}

    def _content_scores(self, user_id: int):
        if user_id not in self.user_item_matrix.index:
            return {}

        user_row = self.user_item_matrix.loc[user_id]
        seen_products = user_row[user_row > 0].index.tolist()

        if not seen_products:
            return {}

        content_scores = {}

        for seen_pid in seen_products:
            if seen_pid not in self.product_similarity.index:
                continue

            sim_series = self.product_similarity.loc[seen_pid]

            for candidate_pid, sim_score in sim_series.items():
                if candidate_pid != seen_pid and candidate_pid not in seen_products:
                    content_scores[candidate_pid] = content_scores.get(candidate_pid, 0) + sim_score

        if not content_scores:
            return {}

        max_score = max(content_scores.values())
        if max_score == 0:
            return {}

        return {pid: score / max_score for pid, score in content_scores.items() if score > 0}

    def _popular_scores(self, exclude_products=None):
        exclude_products = set(exclude_products or [])
        return {
            pid: score for pid, score in self.popularity_scores.items()
            if pid not in exclude_products
        }

    def recommend_for_user(
        self,
        user_id: int,
        top_n: int = 5,
        alpha: float = 0.5,
        beta: float = 0.3,
        gamma: float = 0.2
    ):
        seen_products = set()

        if self.user_item_matrix is not None and user_id in self.user_item_matrix.index:
            seen_products = set(
                self.user_item_matrix.loc[user_id][self.user_item_matrix.loc[user_id] > 0].index.tolist()
            )

        collab_scores = self._collaborative_scores(user_id)
        content_scores = self._content_scores(user_id)
        popular_scores = self._popular_scores(exclude_products=seen_products)

        all_candidate_ids = set(collab_scores) | set(content_scores) | set(popular_scores)

        final_scores = {}
        reasons = {}

        for pid in all_candidate_ids:
            collab = collab_scores.get(pid, 0)
            content = content_scores.get(pid, 0)
            popular = popular_scores.get(pid, 0)

            final_score = (
                alpha * collab +
                beta * content +
                gamma * popular
            )
            final_scores[pid] = final_score

            max_part = max(
                [
                     ("Duoc goi y vi nguoi dung tuong tu da quan tam", collab),
        ("Duoc goi y vi cung danh muc/noi dung tuong tu", content),
        ("Duoc goi y vi san pham pho bien", popular)
                ],
                key=lambda x: x[1]
            )[0]
            reasons[pid] = max_part

        ranked = [(pid, score) for pid, score in final_scores.items() if score > 0]
        ranked = sorted(ranked, key=lambda x: x[1], reverse=True)[:top_n]

        if not ranked:
            return []

        product_ids = [pid for pid, _ in ranked]

        result = self.products_df[self.products_df["product_id"].isin(product_ids)].copy()
        result["rank_score"] = result["product_id"].map(dict(ranked))
        result["reason"] = result["product_id"].map(reasons)
        result = result.sort_values("rank_score", ascending=False)

        return result[
            ["product_id", "name", "category", "price", "description", "rank_score", "reason"]
        ].to_dict(orient="records")