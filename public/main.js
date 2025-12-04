document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  const messageEl = document.getElementById("form-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    messageEl.textContent = "";
    messageEl.className = "message";

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      // Check if response is ok before trying to parse JSON
      if (!res.ok) {
        // Try to get error message from response
        let errorMessage = "Something went wrong.";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = res.statusText || `Error ${res.status}`;
        }
        messageEl.textContent = errorMessage;
        messageEl.classList.add("error");
        return;
      }

      // Parse JSON response
      let json;
      try {
        json = await res.json();
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        messageEl.textContent = "Invalid response from server.";
        messageEl.classList.add("error");
        return;
      }

      messageEl.textContent = json.message || "Thank you and good luck.";
      messageEl.classList.add("success");
      form.reset();
    } catch (err) {
      console.error("Network error:", err);
      messageEl.textContent = `Network error: ${err.message}. Please check your connection and try again.`;
      messageEl.classList.add("error");
    }
  });
});
