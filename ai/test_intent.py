from ai.models.intent_model import IntentClassifier

intent_model = IntentClassifier("ai/data/intent_data.csv")
intent_model.load_data()
intent_model.train()

tests = [
    "co cod khong",
    "shop giao hang nhu nao",
    "giay trang",
    "ao nam dep",
    "goi y cho toi",
    "nen mua gi bay gio"
]

for text in tests:
    result = intent_model.predict_with_score(text)
    print(f"Cau: {text}")
    print(f"Intent: {result['intent']}")
    print(f"Score: {result['score']:.4f}")
    print(f"Probs: {result['probs']}")
    print("-" * 40)