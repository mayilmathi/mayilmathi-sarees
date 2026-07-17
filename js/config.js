/* ============================================================
   MAYILMATHI SAREES — CONFIGURATION
   ------------------------------------------------------------
   1. Deploy apps-script/Code.gs as a Web App (see README.md).
   2. Paste the deployment URL below, ending in /exec.
   3. Paste your GitHub repo's raw image folder path below —
      this is where saree photos live, e.g.:
      https://raw.githubusercontent.com/USERNAME/REPO/main/images/sarees/
============================================================ */

const CONFIG = {
  // Your deployed Google Apps Script Web App URL
  API_URL: "https://script.google.com/macros/s/AKfycbyxjnTwZxXRNQctuRvvmVQMw6rYrOXcS42We_yeDvScFLRwrbTaCl2fZbzDcft4wyyS/exec",

  // Where saree photos are hosted on GitHub (raw file base URL, trailing slash)
  IMAGE_BASE_URL: "https://raw.githubusercontent.com/mayilmathi/mayilmathi-sarees/main/images/sarees/",

  // Public link to your GitHub repo image folder (shown as a "view all photos" link)
  IMAGE_REPO_LINK: "https://github.com/USERNAME/REPO/tree/main/images/sarees"
};
