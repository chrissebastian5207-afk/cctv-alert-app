// =====================================================
// 📱 CCTV ALERT SYSTEM — INSTALL PROMPT HANDLER (FINAL)
// =====================================================

let deferredPrompt;

// Listen for the install prompt event
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault(); // Prevent Chrome from showing default mini-infobar
  deferredPrompt = event;
  console.log("📲 Install prompt saved and ready to show.");

  // Show custom install button if you want
  const installBtn = document.getElementById("installAppBtn");
  if (installBtn) {
    installBtn.style.display = "inline-block";
    installBtn.addEventListener("click", async () => {
      console.log("🚀 User clicked Install App button");
      installBtn.style.display = "none";
      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;
      console.log(`✅ User response: ${outcome}`);
      deferredPrompt = null;
    });
  }
});

// Detect when the app is successfully installed
window.addEventListener("appinstalled", () => {
  console.log("🎉 App successfully installed!");
  alert("✅ CCTV Alert System has been installed on your device!");
});
