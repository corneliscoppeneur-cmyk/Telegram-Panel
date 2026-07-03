window.telegramPanel = window.telegramPanel || {};

window.telegramPanel.notifyLegacyHost = (kind, message) => {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        source: "telegram-panel",
        type: "legacy-module-event",
        kind: String(kind || "info"),
        message: message ? String(message) : "",
        path: window.location.pathname,
        search: window.location.search,
      }, window.location.origin);
    }
  } catch (_) {
    // iframe 父窗口通知失败不影响旧页面自身运行。
  }
};

window.telegramPanel.showBlazorError = (message) => {
  const ui = document.getElementById("blazor-error-ui");
  const text = document.getElementById("blazor-error-message");
  if (text && message) text.textContent = String(message);
  if (ui) ui.style.display = "block";
  window.telegramPanel.notifyLegacyHost("blazor-error", message || "页面运行出错。");
};

window.telegramPanel.watchBlazorErrorUi = () => {
  const ui = document.getElementById("blazor-error-ui");
  if (!ui || ui.dataset.telegramPanelWatched === "1") return;
  ui.dataset.telegramPanelWatched = "1";

  const notifyIfVisible = () => {
    const style = window.getComputedStyle(ui);
    if (style.display !== "none" && style.visibility !== "hidden") {
      const text = document.getElementById("blazor-error-message");
      window.telegramPanel.notifyLegacyHost(
        "blazor-error",
        text && text.textContent ? text.textContent : "页面运行出错。"
      );
    }
  };

  try {
    const observer = new MutationObserver(notifyIfVisible);
    observer.observe(ui, { attributes: true, attributeFilter: ["style", "class"] });
    notifyIfVisible();
  } catch (_) {
    // MutationObserver 不可用时忽略；showBlazorError 仍会通知。
  }
};

window.telegramPanel.startBlazor = async () => {
  if (!window.Blazor || !window.Blazor.start) {
    window.telegramPanel.showBlazorError("Blazor 脚本未正确加载，请检查 _framework/blazor.web.js。");
    return;
  }

  try {
    await window.Blazor.start({
      circuit: {
        reconnectionOptions: {
          maxRetries: 8,
          retryIntervalMilliseconds: 1500,
        },
      },
    });
    window.telegramPanel.notifyLegacyHost("blazor-started", "");
  } catch (error) {
    console.error(error);
    const message = error && error.message
      ? error.message
      : "Blazor Server 连接启动失败，请检查反向代理是否支持 /_blazor WebSocket。";
    window.telegramPanel.showBlazorError(message);
  }
};

window.addEventListener("DOMContentLoaded", () => {
  window.telegramPanel.watchBlazorErrorUi();
});

window.telegramPanel.copyText = async (text) => {
  if (text === null || text === undefined) return;
  const value = String(text);

  try {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch (_) {
    // ignore and fallback
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "2em";
    textarea.style.height = "2em";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.boxShadow = "none";
    textarea.style.background = "transparent";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    // iOS Safari 需要显式 setSelectionRange
    textarea.setSelectionRange(0, textarea.value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (ok) return;
  } catch (_) {
    // ignore and fallback
  }

  // 最终兜底：弹窗可手动复制（在部分移动端/非安全上下文下更稳定）
  try {
    window.prompt("复制以下内容：", value);
  } catch (_) {
    // ignore
  }
};

