import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from ai.models.recommend_model import RecommendationModel
from ai.models.chatbot_model import ChatbotModel
from ai.models.search_model import ProductSearchModel

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(
    title="Ecommerce AI API",
    description="API cho Recommendation, Chatbot, Smart Search",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# LOAD MODEL 1: RECOMMEND
# =========================
rec_model = RecommendationModel(
    history_path=os.path.join(BASE_DIR, "data", "user_history.csv"),
    products_path=os.path.join(BASE_DIR, "data", "products.csv")
)
rec_model.load_data()
rec_model.preprocess()
rec_model.train()

# =========================
# LOAD MODEL 2: CHATBOT
# =========================
bot_model = ChatbotModel(
    faq_path=os.path.join(BASE_DIR, "data", "faq.csv")
)
bot_model.load_data()
bot_model.train()

# =========================
# LOAD MODEL 3: SEARCH
# =========================
search_model = ProductSearchModel(
    products_path=os.path.join(BASE_DIR, "data", "products.csv")
)
search_model.load_data()
search_model.train()


@app.get("/")
def home():
    return {
        "message": "Ecommerce AI API is running",
        "endpoints": [
            "/recommend/{user_id}",
            "/chat?q=...",
            "/search?q=..."
        ]
    }


@app.get("/recommend/{user_id}")
def recommend(user_id: int, top_n: int = 5):
    try:
        data = rec_model.recommend_for_user(user_id=user_id, top_n=top_n)
        return {
            "success": True,
            "user_id": user_id,
            "total": len(data),
            "data": data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/chat")
def chat(q: str = Query(..., description="Cau hoi cua nguoi dung")):
    try:
        result = bot_model.ask(q)
        return {
            "success": True,
            "question": q,
            "answer": result["answer"],
            "score": result["score"]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/search")
def search(q: str = Query(..., description="Tu khoa tim kiem"), top_n: int = 5):
    try:
        data = search_model.search(q, top_n=top_n)
        return {
            "success": True,
            "query": q,
            "total": len(data),
            "data": data
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }