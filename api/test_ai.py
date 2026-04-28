import os
from ai.models.recommend_model import RecommendationModel
from ai.models.chatbot_model import ChatbotModel
from ai.models.search_model import ProductSearchModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def test_recommend():
    print("=== TEST RECOMMENDATION ===")
    rec_model = RecommendationModel(
        history_path=os.path.join(BASE_DIR, "ai", "data", "user_history.csv"),
        products_path=os.path.join(BASE_DIR, "ai", "data", "products.csv")
    )
    rec_model.load_data()
    rec_model.preprocess()
    rec_model.train()

    user_id = 1
    recommendations = rec_model.recommend_for_user(user_id=user_id, top_n=3)

    print(f"Goi y cho user {user_id}:")
    if not recommendations:
        print("Khong co goi y phu hop.")
    for item in recommendations:
        print(item)


def test_chatbot():
    print("\n=== TEST CHATBOT ===")
    bot = ChatbotModel(
        faq_path=os.path.join(BASE_DIR, "ai", "data", "faq.csv")
    )
    bot.load_data()
    bot.train()

    questions = [
        "shop co giao hang khong",
        "doi tra nhu nao",
        "co cod khong"
    ]

    for q in questions:
        result = bot.ask(q)
        print(f"\nCau hoi: {q}")
        print(f"Tra loi: {result['answer']}")
        print(f"Score : {result['score']:.4f}")


def test_search():
    print("\n=== TEST SMART SEARCH ===")
    search_model = ProductSearchModel(
        products_path=os.path.join(BASE_DIR, "ai", "data", "products.csv")
    )
    search_model.load_data()
    search_model.train()

    queries = [
        "giay trang",
        "ao",
        "phu kien",
        "quan den"
    ]

    for q in queries:
        results = search_model.search(q, top_n=3)
        print(f"\nTim kiem: {q}")
        if not results:
            print("Khong tim thay san pham phu hop.")
        for item in results:
            print(item)


if __name__ == "__main__":
    test_recommend()
    test_chatbot()
    test_search()