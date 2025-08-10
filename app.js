// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyColm4UPGsDRKhF64SZ92oS28eTpZIOS60",
  authDomain: "school-5c077.firebaseapp.com",
  databaseURL: "https://school-5c077-default-rtdb.firebaseio.com",
  projectId: "school-5c077",
  storageBucket: "school-5c077.firebasestorage.app",
  messagingSenderId: "870648604303",
  appId: "1:870648604303:web:2ec437975a6bf5965a72fa",
  measurementId: "G-QSPW57P8XM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const database = firebase.database();
const storage = firebase.storage();

const noticeForm = document.getElementById("noticeForm");
const titleInput = document.getElementById("title");
const pdfFileInput = document.getElementById("pdfFile");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const editKeyInput = document.getElementById("editKey");

const noticeTableBody = document.querySelector("#noticeTable tbody");

let editingKey = null;
let editingFileUrl = null;
let editingFilePath = null;

// Format date/time helper
function formatDateTime(dateString) {
  const date = new Date(dateString);
  const optionsDate = { day: '2-digit', month: 'long', year: 'numeric' };
  const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: true };
  const datePart = date.toLocaleDateString('en-US', optionsDate);
  const timePart = date.toLocaleTimeString('en-US', optionsTime);
  return { datePart, timePart };
}

// Load notices from Firebase DB
function loadNotices() {
  noticeTableBody.innerHTML = "";
  database.ref('notices').orderByChild('publishedAt').once('value', snapshot => {
    const notices = [];
    snapshot.forEach(childSnap => {
      notices.push({ key: childSnap.key, ...childSnap.val() });
    });
    notices.reverse();

    notices.forEach((notice, index) => {
      const tr = document.createElement("tr");

      const snTd = document.createElement("td");
      snTd.textContent = index + 1;

      const titleTd = document.createElement("td");
      titleTd.textContent = notice.title;

      const dateTd = document.createElement("td");
      const { datePart, timePart } = formatDateTime(notice.publishedAt);
      const dateSpan = document.createElement("span");
      dateSpan.textContent = datePart;
      dateSpan.className = "date-line";
      const timeSpan = document.createElement("span");
      timeSpan.textContent = timePart;
      timeSpan.className = "time-line";
      dateTd.appendChild(dateSpan);
      dateTd.appendChild(timeSpan);

      const actionsTd = document.createElement("td");
      actionsTd.className = "actions";

      // View button - open pdf url in new tab
      const viewBtn = document.createElement("button");
      viewBtn.textContent = "View";
      viewBtn.className = "view";
      viewBtn.onclick = () => {
        window.open(notice.fileUrl, "_blank");
      };

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "edit";
      editBtn.onclick = () => startEditNotice(notice);

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "delete";
      deleteBtn.onclick = () => {
        if (confirm("Are you sure you want to delete this notice?")) {
          deleteNotice(notice.key, notice.fileStoragePath);
        }
      };

      actionsTd.appendChild(viewBtn);
      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(deleteBtn);

      tr.appendChild(snTd);
      tr.appendChild(titleTd);
      tr.appendChild(dateTd);
      tr.appendChild(actionsTd);

      noticeTableBody.appendChild(tr);
    });
  });
}

// Delete notice & PDF file
function deleteNotice(key, storagePath) {
  database.ref('notices/' + key).remove()
    .then(() => {
      if (storagePath) {
        return storage.ref(storagePath).delete();
      }
    })
    .then(() => {
      alert("Notice deleted successfully.");
      loadNotices();
      resetForm();
    })
    .catch(err => alert("Error deleting notice: " + err.message));
}

// Start edit
function startEditNotice(notice) {
  editingKey = notice.key;
  editingFileUrl = notice.fileUrl;
  editingFilePath = notice.fileStoragePath;

  titleInput.value = notice.title;
  editKeyInput.value = notice.key;
  pdfFileInput.value = "";

  submitBtn.textContent = "Update Notice";
  cancelEditBtn.style.display = "inline-block";
}

// Cancel edit
cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

// Reset form
function resetForm() {
  editingKey = null;
  editingFileUrl = null;
  editingFilePath = null;

  editKeyInput.value = "";
  titleInput.value = "";
  pdfFileInput.value = "";
  submitBtn.textContent = "Publish Notice";
  cancelEditBtn.style.display = "none";
}

// Form submit - add or update
noticeForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const file = pdfFileInput.files[0];

  if (!title) {
    alert("Please enter a notice title.");
    return;
  }

  if (!editingKey && !file) {
    alert("Please select a PDF file.");
    return;
  }

  try {
    submitBtn.disabled = true;

    let fileUrl = editingFileUrl || "";
    let storagePath = editingFilePath || "";

    if (file) {
      storagePath = `notices/${Date.now()}_${file.name}`;
      const storageRef = storage.ref(storagePath);
      await storageRef.put(file);
      fileUrl = await storageRef.getDownloadURL();
    }

    const noticeData = {
      title,
      fileUrl,
      fileStoragePath: storagePath,
      publishedAt: new Date().toISOString()
    };

    if (editingKey) {
      await database.ref('notices/' + editingKey).update(noticeData);
      alert("Notice updated successfully.");
    } else {
      await database.ref('notices').push(noticeData);
      alert("Notice published successfully.");
    }

    resetForm();
    loadNotices();
  } catch (error) {
    alert("Error saving notice: " + error.message);
  } finally {
    submitBtn.disabled = false;
  }
});

// Initial load
loadNotices();
