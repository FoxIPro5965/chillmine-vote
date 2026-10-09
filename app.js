(() => {
  const API = (window.CHILLMINE_VOTE_CONFIG?.API_BASE || "").replace(/\/+$/, "");
  const $ = id => document.getElementById(id);
  const tokenKey = "chillmine_vote_session";
  let token = localStorage.getItem(tokenKey) || "";
  let currentStatus = null;
  const say = (text, type = "") => { $("message").textContent = text; $("message").className = "message " + type; };
  async function api(path, options = {}) {
    if (!API || API.includes("YOUR-WORKER-NAME")) throw new Error("Chưa cấu hình API_BASE trong config.js.");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = "Bearer " + token;
    const response = await fetch(API + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Có lỗi xảy ra. Thử lại sau.");
    return data;
  }
  function showLinked(username) {
    $("username").textContent = username;
    $("linkState").textContent = "Tài khoản đã được xác minh";
    $("linkForm").classList.add("hidden");
    $("unlink").classList.remove("hidden");
  }
  function showUnlinked() {
    token = ""; localStorage.removeItem(tokenKey);
    $("username").textContent = "Chưa liên kết";
    $("linkState").textContent = "Vào game và chạy /vote link để nhận mã.";
    $("linkForm").classList.remove("hidden");
    $("unlink").classList.add("hidden");
    $("status").textContent = "Chưa liên kết";
    $("voteBtn").disabled = true; $("voteBtn").textContent = "LIÊN KẾT ĐỂ VOTE";
    $("timer").textContent = "";
  }
  async function refresh() {
    if (!token) { showUnlinked(); return; }
    try {
      const s = await api("/api/status");
      currentStatus = s; showLinked(s.username);
      if (s.canVote) {
        $("status").textContent = "Sẵn sàng vote";
        $("voteBtn").disabled = false; $("voteBtn").textContent = "VOTE NHẬN RANK 24H";
        $("timer").textContent = "";
      } else {
        $("status").textContent = "Đã vote";
        $("voteBtn").disabled = true; $("voteBtn").textContent = "ĐÃ VOTE";
        renderTimer(s.nextVoteAt);
      }
    } catch (e) {
      if (e.message.includes("Phiên đăng nhập")) showUnlinked();
      say(e.message, "bad");
    }
  }
  function renderTimer(nextAt) {
    if (!nextAt) return;
    const update = () => {
      const left = Math.max(0, nextAt - Math.floor(Date.now()/1000));
      if (!left) { $("timer").textContent = "Bạn có thể vote lại!"; refresh(); return; }
      const h = Math.floor(left/3600), m = Math.floor(left%3600/60), s = left%60;
      $("timer").textContent = `Vote lại sau ${h} giờ ${m} phút ${s} giây`;
    };
    update();
  }
  $("linkBtn").addEventListener("click", async () => {
    const username = $("mcname").value.trim(), code = $("code").value.trim().toUpperCase();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username) || !/^[A-Z0-9]{6}$/.test(code)) {
      say("Hãy nhập tên Minecraft hợp lệ và mã 6 ký tự.", "bad"); return;
    }
    $("linkBtn").disabled = true;
    try {
      const result = await api("/api/verify-link", { method: "POST", body: JSON.stringify({ username, code }) });
      token = result.token; localStorage.setItem(tokenKey, token);
      say("Liên kết thành công! Bạn có thể vote.", "good"); await refresh();
    } catch (e) { say(e.message, "bad"); }
    finally { $("linkBtn").disabled = false; }
  });
  $("voteBtn").addEventListener("click", async () => {
    if (!token) return;
    $("voteBtn").disabled = true;
    try {
      const result = await api("/api/vote", { method: "POST", body: "{}" });
      say(result.message, "good"); await refresh();
    } catch (e) { say(e.message, "bad"); await refresh(); }
  });
  $("unlink").addEventListener("click", () => { showUnlinked(); say("Đã đăng xuất khỏi website."); });
  refresh();
})();
