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

      const json = await res.json();

      if (res.ok) {
        messageEl.textContent = json.message; // "Thank you and good luck."
        messageEl.classList.add("success");
        form.reset();
      } else {
        messageEl.textContent = json.message || "Something went wrong.";
        messageEl.classList.add("error");
      }
    } catch (err) {
      console.error(err);
      messageEl.textContent = "Network error. Please try again.";
      messageEl.classList.add("error");
    }
  });
});
