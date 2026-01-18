(function () {
  function likeLabel(count) {
    return count === 1 ? "Like" : "Likes";
  }

  function updateLikeUI(link, data) {
    const section = link.closest(".like-section");
    const countEl = section ? section.querySelector(".like-count") : null;
    if (countEl) {
      countEl.textContent = `${data.count}`;

    }

    link.dataset.liked = data.liked ? "true" : "false";
    link.classList.toggle("liked", data.liked);
    link.title = data.liked ? "Unlike this content" : "Like this content";
    link.textContent = data.liked ? "❤️" : "🤍";
  }

  async function handleLikeClick(e) {
    const link = e.target.closest("a[data-like='true']");
    if (!link) return;
    e.preventDefault();

    const slug = link.dataset.slug;
    if (!slug) return;

    try {
      const res = await fetch(`/content/${slug}/like`, {
        method: "POST",
        headers: { Accept: "application/json" }
      });

      if (res.status === 401) {
        const body = await res.json().catch(() => null);
        window.location.href = body?.redirect || link.getAttribute("href");
        return;
      }

      if (!res.ok) throw new Error("Like failed");

      const data = await res.json();
      updateLikeUI(link, data);
    } catch (err) {
      console.error("Like toggle failed:", err);
    }
  }

  document.addEventListener("click", handleLikeClick);
})();
