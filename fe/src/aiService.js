export async function askAssistant(message, userId = null) {
  const res = await fetch("http://localhost:8888/api/ai/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message,
      user_id: userId
    })
  });

  const data = await res.json();
  return data;
}